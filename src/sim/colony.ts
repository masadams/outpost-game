import { createShielding, isShield, type ShieldState, type ShieldLedger } from './shieldConfig';
import { maintainShields, chargeShields, drainShield } from './shields';
import { createResearch, type ResearchState, type ProgressionAction } from './progressionConfig';
import { stepResearch } from './research';
import type { ExplorationAction } from './explorationConfig';
import { createCommand, type CommandState, type CommandAction } from './commandConfig';
import { completedBuilding, stepConstruction } from './construction';
import { orderedBuildings, powerFraction } from './power';
import { depositAt } from './geology';
import { foundationSites } from './colonyPlacement';
import { isHabitat, type HabitatState } from './habitatConfig';
import { stepHabitats, chargeHabitats, ventHabitat } from './habitats';
import type { TowAction } from './towingConfig';
import { stepMiningRig } from './surfaceExtraction';
import { availableProduct, createPolicy, industrialPowerBlock, MAX_RESERVE, POLICY_FIELDS, POLICY_INFO, type ColonyPolicy, type PolicyAction } from './colonyPolicy';
import { createSchedule, hasRecipeInputs, hasRecipeRoom, MAX_STOCK_TARGET, selectScheduledRecipe, SCHEDULE_PRODUCTS, type RefinerySchedule, type SchedulingAction } from './scheduling';
import type { CombatAction } from './combatConfig';
import type { DefenceAction } from './defenceConfig';
import { operational, buildingHealth } from './buildingHealth';
import { BLUEPRINTS, BUILD_TYPES, PRODUCTS, type BuildType, type ProductInventory, REFINERY_RECIPES, FUEL_RECIPE, type Recipe } from './colonyConfig';
import { WORLD } from './config';
import { clamp, localAngle, wrap } from './math';
import { inventoryMass } from './resources';
import { STATIONS } from './stations';
import { notify } from './messages';
import type { WorldState } from './world';

export interface Building {
  dispatch?: { rank: number; limit: number };
  gridPower?: number; requestedPower?: number;
  habitat?: HabitatState;
  shield?: ShieldState;
  schedule?: RefinerySchedule;
  depositId?: number; health?: number; turret?: { aim: number; cooldown: number; automatic: boolean };
  id: number; kind: BuildType; angle: number; enabled: boolean; progress: number; recipe: number;
  status: 'idle' | 'running' | 'no power' | 'no feedstock' | 'output full' | 'disabled' | 'wrecked' | 'no deposit' | 'depleted' | 'target met' | 'power reserved' | 'delivery reserved' | 'pressurizing' | 'air low' | 'breathable' | 'power limited' | 'research staffed' | 'shield active' | 'shield charging' | 'shield breached';
}
export interface Colony {
  shielding: ShieldLedger;
  research: ResearchState;
  command: CommandState;
  oxygenUsed: number;
  policy?: ColonyPolicy;
  buildings: Building[]; products: ProductInventory; energy: number; generation: number; demand: number;
  buildOpen: boolean; selected: BuildType; offset: number; nextId: number;
}
export type ColonyAction = ProgressionAction | ExplorationAction | CommandAction | TowAction | PolicyAction | SchedulingAction | CombatAction | DefenceAction | { type: 'toggleBuild' } | { type: 'select'; kind: BuildType } |
  { type: 'shift'; delta: number } | { type: 'place' } | { type: 'demolish' } | { type: 'cycleRecipe' } | { type: 'toggleMachine' };
export function createColony(): Colony {
  // A finite fabrication kit starts construction without granting raw ore or recurring income.
  return { shielding: createShielding(), research: createResearch(), command: createCommand(), oxygenUsed: 0, buildings: [], products: { alloy: 28, wire: 14, components: 8, water: 4, oxygen: 2, fuel: 0 },
    energy: 0, generation: 0, demand: 0, buildOpen: false, selected: 'solar', offset: 24, nextId: 1 };
}
export const oreCapacity = (colony: Colony): number => 400 + colony.buildings.filter(b => b.kind === 'storage' && operational(b)).length * 200;
export const productCapacity = (colony: Colony): number => 100 + colony.buildings.filter(b => b.kind === 'storage' && operational(b)).length * 100;
export const energyCapacity = (colony: Colony): number => 20 + colony.buildings.filter(b => b.kind === 'battery' && operational(b)).length * 200;
export const previewAngle = (world: WorldState): number => wrap(localAngle(world.astronaut.position) + world.colony.offset / WORLD.radius);
export function placementError(world: WorldState, kind = world.colony.selected, angle = previewAngle(world), options: { remote?: boolean; paid?: boolean; reservations?: Building[] } = {}): string | null {
  if (!options.remote && (world.playerMode !== 'astronaut' || !world.astronaut.grounded || world.astronaut.health <= 0)) return 'Stand on the surface to build';
  if (world.colony.buildings.length + (options.reservations?.length ?? world.colony.command.queue.length) >= 48) return 'Colony limit: 48 facilities';
  if (!Number.isFinite(angle) || angle < -Math.PI || angle > Math.PI) return 'Invalid site angle';
  if (!options.remote && Math.abs(wrap(angle - localAngle(world.astronaut.position))) * WORLD.radius > 97) return 'Build within 96 m of the astronaut';
  if (isShield(kind) && !world.colony.research.completed.includes('combat')) return 'Requires Combat engineering research';
  const width = BLUEPRINTS[kind].halfWidth;
  const sites = foundationSites(kind, angle);
  if (sites.some(s => Math.abs(wrap(s.angle)) * WORLD.radius < 36 + s.halfWidth - 1e-7)) return 'Keep the landing pad clear';
  if (sites.some(site => STATIONS.some(s => Math.abs(wrap(site.angle - s.angle)) * WORLD.radius < site.halfWidth + 13 - 1e-7))) return 'Keep the home terminals clear';
  if (sites.some(site => [...world.colony.buildings, ...(options.reservations ?? world.colony.command.queue)].some(b => foundationSites(b.kind, b.angle).some(other => Math.abs(wrap(site.angle - other.angle)) * WORLD.radius < site.halfWidth + other.halfWidth + 4 - 1e-7)))) return 'Facilities overlap';
  if (kind === 'miningRig') {
    const d = depositAt(world.surfaceDeposits, angle, width);
    if (!d) return 'Place the whole rig footprint on a marked surface deposit';
    if (d.remaining <= 1e-9) return 'Deposit exhausted · prospect another seam';
  }
  if (!options.paid && PRODUCTS.some(p => world.colony.products[p] + 1e-9 < (BLUEPRINTS[kind].cost[p] ?? 0))) return 'Insufficient fabrication materials';
  if (!options.paid && PRODUCTS.some(p => availableProduct(world.colony, p) + 1e-9 < (BLUEPRINTS[kind].cost[p] ?? 0))) return 'Materials reserved for turrets · lower reserves in Colony';
  return null;
}
export function nearbyBuilding(world: WorldState): Building | undefined {
  if (world.playerMode !== 'astronaut') return undefined;
  const angle = localAngle(world.astronaut.position);
  return world.colony.buildings.map(b => ({ b, distance: Math.min(Math.abs(wrap(b.angle - angle)) * WORLD.radius, ...foundationSites(b.kind, b.angle).map(s => Math.abs(wrap(s.angle - angle)) * WORLD.radius)) }))
    .filter(v => v.distance <= 18).sort((a, b) => a.distance - b.distance || a.b.id - b.b.id)[0]?.b;
}
export function applyColonyAction(world: WorldState, action: ColonyAction): void {
  if (action.type === 'adjustPolicy') {
    if (!POLICY_FIELDS.includes(action.field) || (action.direction !== -1 && action.direction !== 1)) return;
    const policy = world.colony.policy ??= createPolicy();
    policy[action.field] = clamp(policy[action.field] + action.direction * POLICY_INFO[action.field].step, 0, MAX_RESERVE);
    return;
  }
  if (world.playerMode !== 'astronaut' || !world.astronaut.grounded || world.astronaut.health <= 0) { notify(world, 'LEAVE THE SHIP AND STAND ON THE SURFACE TO BUILD'); return; }
  const colony = world.colony;
  if (action.type === 'toggleBuild') { colony.buildOpen = !colony.buildOpen; return; }
  if (action.type === 'select') { if (BUILD_TYPES.includes(action.kind)) colony.selected = action.kind; return; }
  if (action.type === 'shift') { colony.offset = clamp(colony.offset + action.delta, -96, 96); return; }
  if (action.type === 'place') {
    if (!colony.buildOpen) return;
    const error = placementError(world); if (error) { notify(world, error); return; }
    const blueprint = BLUEPRINTS[colony.selected];
    for (const product of PRODUCTS) colony.products[product] = Math.max(0, colony.products[product] - (blueprint.cost[product] ?? 0));
    colony.buildings.push(completedBuilding(colony.nextId++, colony.selected, previewAngle(world), world));
    notify(world, `${blueprint.label.toUpperCase()} BUILT`); return;
  }
  const building = nearbyBuilding(world);
  if (!building) { notify(world, 'STAND WITHIN 18 m OF A FACILITY'); return; }
  if (action.type === 'demolish') {
    if (!colony.buildOpen) return;
    const remaining = { ...colony, buildings: colony.buildings.filter(b => b.id !== building.id) };
    if (inventoryMass(world.depot) > oreCapacity(remaining) || PRODUCTS.some(p => colony.products[p] + (BLUEPRINTS[building.kind].cost[p] ?? 0) * 0.75 * buildingHealth(building) / 100 > productCapacity(remaining))) {
      notify(world, 'NOT ENOUGH STORAGE AFTER DEMOLITION'); return;
    }
    ventHabitat(world, building); drainShield(world, building); colony.buildings = remaining.buildings;
    if (world.defence.controlled === building.id) world.defence.controlled = null;
    for (const p of PRODUCTS) colony.products[p] += (BLUEPRINTS[building.kind].cost[p] ?? 0) * 0.75 * buildingHealth(building) / 100;
    colony.energy = Math.min(colony.energy, energyCapacity(colony));
    notify(world, 'FACILITY REMOVED · SALVAGE SCALES WITH REMAINING HULL');
  } else applyFacilityAction(world, building, action);
}
export function applyFacilityAction(world: WorldState, building: Building, action: ColonyAction): void {
  if (!operational(building)) { notify(world, 'FACILITY WRECKED · U TO REPAIR');
  } else if ((action.type === 'toggleSchedule' || action.type === 'adjustTarget') && building.kind === 'refinery') {
    const schedule = building.schedule ??= createSchedule();
    if (action.type === 'toggleSchedule') { schedule.enabled = !schedule.enabled; notify(world, schedule.enabled ? 'AUTO RECIPES ON · SHARED STOCK TARGETS' : 'AUTO RECIPES OFF · CURRENT RECIPE RETAINED'); }
    else if (SCHEDULE_PRODUCTS.includes(action.product) && (action.delta === -5 || action.delta === 5)) {
      schedule.targets[action.product] = clamp(schedule.targets[action.product] + action.delta, 0, MAX_STOCK_TARGET);
    }
  } else if (action.type === 'cycleRecipe' && building.kind === 'refinery') {
    if (building.schedule) building.schedule.enabled = false;
    building.recipe = (building.recipe + 1) % REFINERY_RECIPES.length; building.progress = 0;
    notify(world, REFINERY_RECIPES[building.recipe].label);
  } else if (action.type === 'toggleMachine') {
    if (building.kind === 'storage' || building.kind === 'battery') { notify(world, 'PASSIVE CAPACITY · NO POWER SWITCH'); return; }
    building.enabled = !building.enabled; notify(world, building.enabled ? 'FACILITY ENABLED' : 'FACILITY DISABLED');
  }
}
export function recipeFor(building: Building): Recipe | null {
  return building.kind === 'refinery' ? REFINERY_RECIPES[building.recipe] : building.kind === 'fuelProcessor' ? FUEL_RECIPE : null;
}
export function stepColony(world: WorldState, dt: number): void {
  stepConstruction(world, dt);
  const colony = world.colony;
  for (const b of colony.buildings) { b.gridPower = 0; b.requestedPower = 0; }
  colony.generation = colony.buildings.filter(b => b.kind === 'solar' && b.enabled && operational(b)).reduce((sum, b) => sum + 8 * powerFraction(b), 0);
  for (const b of colony.buildings) if (b.kind === 'solar' && b.enabled && operational(b)) b.gridPower = b.requestedPower = 8 * powerFraction(b);
  colony.energy = Math.min(energyCapacity(colony), colony.energy + colony.generation * dt);
  colony.demand = 0;
  stepHabitats(world, dt, true);
  maintainShields(world, dt);
  chargeHabitats(world, dt);
  chargeShields(world, dt);
  let researchStaffed = false;
  for (const building of orderedBuildings(colony)) {
    if (isHabitat(building.kind) || isShield(building.kind)) continue;
    building.status = !operational(building) ? 'wrecked' : building.enabled ? 'idle' : 'disabled';
    if (!operational(building)) continue;
    if (!building.enabled) continue;
    if (building.kind === 'researchLab') { researchStaffed = stepResearch(world, building, dt, researchStaffed) || researchStaffed; continue; }
    if (building.kind === 'miningRig') { stepMiningRig(world, building, dt, oreCapacity(colony)); continue; }
    if (building.kind === 'refinery' && !selectScheduledRecipe(world, building, productCapacity(colony))) continue;
    const recipe = recipeFor(building); if (!recipe) continue;
    if (!hasRecipeInputs(world, recipe)) { building.status = 'no feedstock'; continue; }
    if (!hasRecipeRoom(colony.products, recipe, productCapacity(colony))) { building.status = 'output full'; continue; }
    const work = dt * powerFraction(building); building.requestedPower = recipe.power * powerFraction(building);
    if (!work) { building.status = 'power limited'; continue; }
    colony.demand += building.requestedPower;
    const block = industrialPowerBlock(colony, recipe.power * work);
    if (block) { building.status = block; continue; }
    colony.energy = Math.max(0, colony.energy - recipe.power * work); building.gridPower = recipe.power * powerFraction(building); building.progress += work; building.status = 'running';
    if (building.progress + 1e-9 < recipe.seconds) continue;
    building.progress = 0;
    for (const [r, quantity] of Object.entries(recipe.raw)) world.depot[r as keyof typeof world.depot] = Math.max(0, world.depot[r as keyof typeof world.depot] - quantity);
    for (const [p, quantity] of Object.entries(recipe.input)) colony.products[p as keyof ProductInventory] = Math.max(0, colony.products[p as keyof ProductInventory] - quantity);
    for (const [p, quantity] of Object.entries(recipe.output)) colony.products[p as keyof ProductInventory] += quantity;
    if (building.kind === 'refinery' && building.schedule?.enabled) building.schedule.cursor = (building.recipe + 1) % REFINERY_RECIPES.length;
  }
}
