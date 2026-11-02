import { depositAt } from './geology';
import { stepMiningRig } from './surfaceExtraction';
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
  depositId?: number; health?: number; turret?: { aim: number; cooldown: number; automatic: boolean };
  id: number; kind: BuildType; angle: number; enabled: boolean; progress: number; recipe: number;
  status: 'idle' | 'running' | 'no power' | 'no feedstock' | 'output full' | 'disabled' | 'wrecked' | 'no deposit' | 'depleted';
}
export interface Colony {
  buildings: Building[]; products: ProductInventory; energy: number; generation: number; demand: number;
  buildOpen: boolean; selected: BuildType; offset: number; nextId: number;
}
export type ColonyAction = CombatAction | DefenceAction | { type: 'toggleBuild' } | { type: 'select'; kind: BuildType } |
  { type: 'shift'; delta: number } | { type: 'place' } | { type: 'demolish' } | { type: 'cycleRecipe' } | { type: 'toggleMachine' };
export function createColony(): Colony {
  // A finite fabrication kit starts construction without granting raw ore or recurring income.
  return { buildings: [], products: { alloy: 28, wire: 14, components: 8, water: 4, oxygen: 2, fuel: 0 },
    energy: 0, generation: 0, demand: 0, buildOpen: false, selected: 'solar', offset: 24, nextId: 1 };
}
export const oreCapacity = (colony: Colony): number => 400 + colony.buildings.filter(b => b.kind === 'storage' && operational(b)).length * 200;
export const productCapacity = (colony: Colony): number => 100 + colony.buildings.filter(b => b.kind === 'storage' && operational(b)).length * 100;
export const energyCapacity = (colony: Colony): number => 20 + colony.buildings.filter(b => b.kind === 'battery' && operational(b)).length * 200;
export const previewAngle = (world: WorldState): number => wrap(localAngle(world.astronaut.position) + world.colony.offset / WORLD.radius);
export function placementError(world: WorldState, kind = world.colony.selected, angle = previewAngle(world)): string | null {
  if (world.playerMode !== 'astronaut' || !world.astronaut.grounded || world.astronaut.health <= 0) return 'Stand on the surface to build';
  if (world.colony.buildings.length >= 48) return 'Colony limit: 48 facilities';
  if (Math.abs(wrap(angle - localAngle(world.astronaut.position))) * WORLD.radius > 97) return 'Build within 96 m of the astronaut';
  const width = BLUEPRINTS[kind].halfWidth;
  if (Math.abs(wrap(angle)) * WORLD.radius < 36 + width) return 'Keep the landing pad clear';
  if (STATIONS.some(s => Math.abs(wrap(angle - s.angle)) * WORLD.radius < width + 13)) return 'Keep the home terminals clear';
  if (world.colony.buildings.some(b => Math.abs(wrap(angle - b.angle)) * WORLD.radius < width + BLUEPRINTS[b.kind].halfWidth + 4)) return 'Facilities overlap';
  if (kind === 'miningRig') {
    const d = depositAt(world.surfaceDeposits, angle, width);
    if (!d) return 'Place the whole rig footprint on a marked surface deposit';
    if (d.remaining <= 1e-9) return 'Deposit exhausted · prospect another seam';
  }
  if (PRODUCTS.some(p => world.colony.products[p] + 1e-9 < (BLUEPRINTS[kind].cost[p] ?? 0))) return 'Insufficient fabrication materials';
  return null;
}
export function nearbyBuilding(world: WorldState): Building | undefined {
  if (world.playerMode !== 'astronaut') return undefined;
  return world.colony.buildings.find(b => Math.abs(wrap(b.angle - localAngle(world.astronaut.position))) * WORLD.radius <= 18);
}
export function applyColonyAction(world: WorldState, action: ColonyAction): void {
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
    colony.buildings.push({ id: colony.nextId++, kind: colony.selected, ...(colony.selected === 'miningRig' ? { depositId: depositAt(world.surfaceDeposits, previewAngle(world), blueprint.halfWidth)!.id } : {}), health: 100, angle: previewAngle(world), enabled: true, progress: 0, recipe: 0, status: 'idle' });
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
    colony.buildings = remaining.buildings;
    if (world.defence.controlled === building.id) world.defence.controlled = null;
    for (const p of PRODUCTS) colony.products[p] += (BLUEPRINTS[building.kind].cost[p] ?? 0) * 0.75 * buildingHealth(building) / 100;
    colony.energy = Math.min(colony.energy, energyCapacity(colony));
    notify(world, 'FACILITY REMOVED · SALVAGE SCALES WITH REMAINING HULL');
  } else if (!operational(building)) { notify(world, 'FACILITY WRECKED · U TO REPAIR');
  } else if (action.type === 'cycleRecipe' && building.kind === 'refinery') {
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
  const colony = world.colony;
  colony.generation = colony.buildings.filter(b => b.kind === 'solar' && b.enabled && operational(b)).length * 8;
  colony.energy = Math.min(energyCapacity(colony), colony.energy + colony.generation * dt);
  colony.demand = 0;
  for (const building of colony.buildings) {
    building.status = !operational(building) ? 'wrecked' : building.enabled ? 'idle' : 'disabled';
    if (!operational(building)) continue;
    if (!building.enabled) continue;
    if (building.kind === 'miningRig') { stepMiningRig(world, building, dt, oreCapacity(colony)); continue; }
    const recipe = recipeFor(building); if (!recipe) continue;
    if (Object.entries(recipe.raw).some(([r, quantity]) => world.depot[r as keyof typeof world.depot] + 1e-9 < quantity) ||
      Object.entries(recipe.input).some(([p, quantity]) => colony.products[p as keyof ProductInventory] + 1e-9 < quantity)) { building.status = 'no feedstock'; continue; }
    if (Object.entries(recipe.output).some(([p, quantity]) => colony.products[p as keyof ProductInventory] + quantity > productCapacity(colony))) { building.status = 'output full'; continue; }
    colony.demand += recipe.power;
    if (colony.energy + 1e-9 < recipe.power * dt) { building.status = 'no power'; continue; }
    colony.energy = Math.max(0, colony.energy - recipe.power * dt); building.progress += dt; building.status = 'running';
    if (building.progress + 1e-9 < recipe.seconds) continue;
    building.progress = 0;
    for (const [r, quantity] of Object.entries(recipe.raw)) world.depot[r as keyof typeof world.depot] = Math.max(0, world.depot[r as keyof typeof world.depot] - quantity);
    for (const [p, quantity] of Object.entries(recipe.input)) colony.products[p as keyof ProductInventory] = Math.max(0, colony.products[p as keyof ProductInventory] - quantity);
    for (const [p, quantity] of Object.entries(recipe.output)) colony.products[p as keyof ProductInventory] += quantity;
  }
}
