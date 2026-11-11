import { onWater } from './nature';
import { deliverPower, feedLimits, islandGroups, linkedBuildings } from './grid';
import { stepObservatory } from './observatory';
import { BOOT_SECONDS, bootStep, isOnline, needsBoot } from './boot';
import { stepTugBay } from './tugBay';
import { buildingLimit, headquarters, hqLevel, hqStorage, isHq, MOST_BUILDINGS } from './headquarters';
import {capacityFactor,workFactor,buildingCost} from './facilityStats';
import type {BuildingUpgradeAction} from './buildingUpgrades';
import type {AutopilotAction} from './autopilotConfig';
import type { CrewAction } from './crewOrders';
import { loadManifest, type ManifestId } from './manifests';
import { nearestPlanet, type BodyId } from './celestial';
import { transferFreight, loadDepotOre, loadAllDepotOre } from './freight';
import { allocateBuildingId, colonyPlanet, localAngleAt } from './localWorld';
import { createShielding, isShield, type ShieldState, type ShieldLedger } from './shieldConfig';
import { maintainShields, chargeShields, drainShield } from './shields';
import { createResearch, type ResearchState, type ProgressionAction } from './progressionConfig';
import { stepResearch } from './research';
import type { ExplorationAction } from './explorationConfig';
import { createCommand, type CommandState, type CommandAction } from './commandConfig';
import { completedBuilding, stepConstruction } from './construction';
import { orderedBuildings, powerFraction, ratedPower } from './power';
import { depositAt, seamKnown } from './geology';
import { foundationSites } from './colonyPlacement';
import { isHabitat, type HabitatState } from './habitatConfig';
import { stepHabitats, chargeHabitats, ventHabitat } from './habitats';
import type { TowAction } from './towingConfig';
import { stepMiningRig } from './surfaceExtraction';
import { stepMinerDrone } from './minerDrone';
import { generatorOutput, isGenerator } from './generators';
import { stepAntenna, stepMassDriver, stepCondenser, stepWorkshop } from './airMachines';
import { availableProduct, createPolicy, industrialPowerBlock, MAX_RESERVE, POLICY_FIELDS, POLICY_INFO, type ColonyPolicy, type PolicyAction } from './colonyPolicy';
import { createSchedule, hasRecipeInputs, hasRecipeRoom, MAX_STOCK_TARGET, selectScheduledRecipe, SCHEDULE_PRODUCTS, type RefinerySchedule, type SchedulingAction } from './scheduling';
import type { CombatAction } from './combatConfig';
import type { DefenceAction } from './defenceConfig';
import { operational, buildingHealth } from './buildingHealth';
import { BLUEPRINTS, BUILD_TYPES, PRODUCTS, type BuildType, type ProductInventory, type Product, REFINERY_RECIPES, FUEL_RECIPE, type Recipe } from './colonyConfig';
import { clamp, wrap } from './math';
import { inventoryMass, RESOURCES, type Resource } from './resources';
import { STATIONS } from './stations';
import { notify } from './messages';
import type { WorldState } from './world';

export interface Building {
  level?:1|2|3;
  /** The rock a tug bay's tug is working. Only on a tug bay. */
  target?: number;
  /** The Headquarters' own level, 1 to 4. Only on the HQ. */
  hqLevel?: number;
  dispatch?: { rank: number; limit: number };
  gridPower?: number; requestedPower?: number;
  /** Seconds of steady power so far while starting up (see boot.ts); undefined means always online. */
  boot?: number;
  /** False when out of reach of the base's power. Set every step; missing means connected. */
  linked?: boolean;
  /** Share of full power that reaches it through relays (less than 1 past a busy or long relay line). Set every step. */
  feed?: number;
  /** Charge (kJ) a battery holds while it is part of a separate island grid. */
  charge?: number;
  /** True while it runs on an island grid away from the pad. Set every step. */
  island?: boolean;
  /** Seconds without power while online. */
  dark?: number;
  /** Seconds left before a machine that shut down for lack of power may try to start again. */
  wait?: number;
  habitat?: HabitatState;
  shield?: ShieldState;
  schedule?: RefinerySchedule;
  depositId?: number; health?: number; turret?: { aim: number; cooldown: number; automatic: boolean };
  id: number; kind: BuildType; angle: number; enabled: boolean; progress: number; recipe: number;
  status: 'idle' | 'running' | 'no power' | 'no feedstock' | 'output full' | 'disabled' | 'wrecked' | 'no deposit' | 'depleted' | 'target met' | 'power reserved' | 'delivery reserved' | 'pressurizing' | 'air low' | 'breathable' | 'power limited' | 'starting' | 'research staffed' | 'shield active' | 'shield charging' | 'shield breached' | 'no fuel' | 'worn out';
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
export type ColonyAction = (AutopilotAction | { type: 'analyseSample' } | { type: 'studyCrystal' } | { type: 'studyCore' } | import('./seedShip').SeedShipAction | import('./headquarters').HqAction | { type: 'sendPod'; from: BodyId; to: BodyId } | { type: 'launchBeacon' } | { type: 'supply'; op: 'toggle' } | { type: 'supplyReserve'; body: BodyId; resource: Resource; delta: number } | { type: 'launchExpedition'; kit: { fuel: boolean; shielding: boolean; stores: boolean }; target?: number | null } | { type: 'expeditionChoice'; choice: string } | { type: 'salvageWreck' } | BuildingUpgradeAction | CrewAction | { type: 'loadManifest'; manifest: ManifestId } | { type: 'loadOre'; resource: keyof WorldState['depot'] } | { type: 'loadAllOre' } | { type: 'freight'; product: Product; delta: number } | ProgressionAction | ExplorationAction | CommandAction | TowAction | PolicyAction | SchedulingAction | CombatAction | DefenceAction | { type: 'buildMode'; open:boolean } | { type: 'toggleBuild' } | { type: 'select'; kind: BuildType } |
  { type: 'shift'; delta: number } | { type: 'place' } | { type: 'demolish' } | { type: 'cycleRecipe' } | { type: 'toggleMachine' }) & { body?: BodyId };
export function createColony(): Colony {
  // A finite fabrication kit starts construction without granting raw ore or recurring income.
  return { shielding: createShielding(), research: createResearch(), command: createCommand(), oxygenUsed: 0, buildings: [], products: { alloy: 28, wire: 14, components: 8, water: 4, oxygen: 2, fuel: 0 },
    energy: 0, generation: 0, demand: 0, buildOpen: false, selected: 'solar', offset: 24, nextId: 1 };
}
const deepStore = (colony: Colony): number => colony.research.completed.includes('deepStorage') ? 1.25 : 1;
export const oreCapacity = (colony: Colony): number => 400 + hqStorage(colony).ore + deepStore(colony) * colony.buildings.filter(b => b.kind === 'storage' && operational(b)).reduce((sum,b)=>sum+200*capacityFactor(b),0);
export const productCapacity = (colony: Colony): number => 100 + hqStorage(colony).materials + deepStore(colony) * colony.buildings.filter(b => b.kind === 'storage' && operational(b)).reduce((sum,b)=>sum+100*capacityFactor(b),0);
/** A battery holds enough to carry a small base through much of a night. */
export const BATTERY_CAPACITY = 1200;
export const energyCapacity = (colony: Colony): number => 20 + hqStorage(colony).energy + colony.buildings.filter(b => b.kind === 'battery' && operational(b) && b.linked !== false).reduce((sum,b)=>sum+BATTERY_CAPACITY*capacityFactor(b),0);
export const previewAngle = (world: WorldState): number => wrap(localAngleAt(world, world.astronaut.position) + world.colony.offset / colonyPlanet(world).radius);
/** Why a blueprint cannot be used yet, or null. The Observatory is earned from the Frost survey buoy (day-cycle games only). */
export function blueprintLock(world: WorldState, kind: BuildType): string | null {
  if (kind === 'observatory' && world.system.sun && !world.exploration.surveyed.includes('frost')) {
    return 'Recover the survey buoy data first';
  }
  return null;
}

export function placementError(world: WorldState, kind = world.colony.selected, angle = previewAngle(world), options: { remote?: boolean; paid?: boolean; reservations?: Building[] } = {}): string | null {
  if (!options.remote && (nearestPlanet(world.astronaut.position, world.system).id !== colonyPlanet(world).id || world.playerMode !== 'astronaut' || !world.astronaut.grounded || world.astronaut.health <= 0)) return 'Stand on the surface to build';
  const limit = buildingLimit(world.colony);
  if (world.colony.buildings.length + (options.reservations?.length ?? world.colony.command.queue.length) >= limit) {
    return headquarters(world.colony) && hqLevel(world.colony) < 4
      ? `This base is at its limit of ${limit} buildings. Upgrade the Headquarters for more room.`
      : `This base is at its limit of ${limit} buildings.`;
  }
  if (!Number.isFinite(angle) || angle < -Math.PI || angle > Math.PI) return 'Invalid site angle';
  if (!options.remote && Math.abs(wrap(angle - localAngleAt(world, world.astronaut.position))) * colonyPlanet(world).radius > 97) return 'Build within 96 m of the astronaut';
  const lock = blueprintLock(world, kind);
  if (lock) return lock;
  if (onWater(colonyPlanet(world).id, (world.rootWorld ?? world).seed, angle)) return 'Cannot build on water';
  if (isShield(kind) && !world.colony.research.completed.includes('combat')) return 'Requires Combat engineering research';
  const width = BLUEPRINTS[kind].halfWidth;
  const sites = foundationSites(kind, angle, colonyPlanet(world).radius);
  if (sites.some(s => Math.abs(wrap(s.angle)) * colonyPlanet(world).radius < 36 + s.halfWidth - 1e-7)) return 'Keep the landing pad clear';
  if (sites.some(site => (world.siteBody === 'moon' ? STATIONS.filter(s => s.kind === 'depot').map(s => ({ ...s, angle: 54 / colonyPlanet(world).radius })) : STATIONS).some(s => Math.abs(wrap(site.angle - s.angle)) * colonyPlanet(world).radius < site.halfWidth + 13 - 1e-7))) return 'Keep the home terminals clear';
  if (sites.some(site => [...world.colony.buildings, ...(options.reservations ?? world.colony.command.queue)].some(b => foundationSites(b.kind, b.angle, colonyPlanet(world).radius).some(other => Math.abs(wrap(site.angle - other.angle)) * colonyPlanet(world).radius < site.halfWidth + other.halfWidth + 4 - 1e-7)))) return 'Facilities overlap';
  if (kind === 'droneBay' && !world.colony.research.completed.includes('precision')) return 'Needs Precision extraction research';
  if (kind === 'miningRig') {
    const d = depositAt(world.surfaceDeposits, angle, width, colonyPlanet(world).radius);
    if (!d) return 'Place the rig on a marked ore deposit';
    if (d.remaining <= 1e-9) return 'This deposit is exhausted';
    if (!seamKnown(d)) return 'Survey this seam first: walk over it, or fly low across it';
  }
  if (!options.paid && PRODUCTS.some(p => world.colony.products[p] + 1e-9 < (BLUEPRINTS[kind].cost[p] ?? 0))) return 'Not enough materials';
  if (!options.paid && PRODUCTS.some(p => availableProduct(world.colony, p) + 1e-9 < (BLUEPRINTS[kind].cost[p] ?? 0))) return 'Materials reserved for turrets · lower reserves in Build';
  return null;
}
export function nearbyBuilding(world: WorldState): Building | undefined {
  if (world.playerMode !== 'astronaut' || nearestPlanet(world.astronaut.position, world.system).id !== colonyPlanet(world).id) return undefined;
  const angle = localAngleAt(world, world.astronaut.position);
  return world.colony.buildings.map(b => ({ b, distance: Math.min(Math.abs(wrap(b.angle - angle)) * colonyPlanet(world).radius, ...foundationSites(b.kind, b.angle, colonyPlanet(world).radius).map(s => Math.abs(wrap(s.angle - angle)) * colonyPlanet(world).radius)) }))
    .filter(v => v.distance <= 18).sort((a, b) => a.distance - b.distance || a.b.id - b.b.id)[0]?.b;
}
export function applyColonyAction(world: WorldState, action: ColonyAction): void {
  if (action.type === 'loadManifest') { loadManifest(world, action.manifest); return; }
  if (action.type === 'loadAllOre') { loadAllDepotOre(world); return; }
  if (action.type === 'loadOre') { loadDepotOre(world, action.resource); return; }
  if (action.type === 'freight') { transferFreight(world, action.product, action.delta); return; }
  if (action.type === 'adjustPolicy') {
    if (!POLICY_FIELDS.includes(action.field) || (action.direction !== -1 && action.direction !== 1)) return;
    const policy = world.colony.policy ??= createPolicy();
    const step = Number.isFinite(action.step) && action.step! > 0 && action.step! <= 200 ? action.step! : POLICY_INFO[action.field].step;
    // Power kept back can be anything up to what the batteries hold; other reserves have a generous ceiling.
    const ceiling = action.field === 'energyReserve' ? Math.max(energyCapacity(world.colony), POLICY_INFO.energyReserve.step) : MAX_RESERVE;
    policy[action.field] = clamp(policy[action.field] + action.direction * step, 0, ceiling);
    return;
  }
  if(action.type==='buildMode'){if(typeof action.open==='boolean')world.colony.buildOpen=action.open;return;}
  if(action.type==='select'){if(BUILD_TYPES.includes(action.kind))world.colony.selected=action.kind;return;}
  if(action.type==='shift'){if(Number.isFinite(action.delta))world.colony.offset=clamp(world.colony.offset+action.delta,-96,96);return;}
  if(action.type==='toggleBuild'){world.colony.buildOpen=!world.colony.buildOpen;return;}
  if (world.playerMode !== 'astronaut' || !world.astronaut.grounded || world.astronaut.health <= 0) { notify(world, 'LEAVE THE SHIP AND STAND ON THE SURFACE TO BUILD'); return; }
  const colony = world.colony;
  if (action.type === 'place') {
    if (!colony.buildOpen) return;
    const error = placementError(world); if (error) { notify(world, error); return; }
    const blueprint = BLUEPRINTS[colony.selected];
    for (const product of PRODUCTS) colony.products[product] = Math.max(0, colony.products[product] - (blueprint.cost[product] ?? 0));
    colony.buildings.push({ ...completedBuilding(allocateBuildingId(world), colony.selected, previewAngle(world), world), ...(needsBoot(colony.selected) && world.system.sun ? { boot: 0 } : {}) });
    notify(world, `${blueprint.label.toUpperCase()} BUILT`); return;
  }
  const building = nearbyBuilding(world);
  if (!building) { notify(world, 'STAND WITHIN 18 m OF A FACILITY'); return; }
  if (action.type === 'demolish') {
    if (!colony.buildOpen) return;
    const error = demolishError(world, building);
    if (error) { notify(world, error.toUpperCase()); return; }
    demolishBuilding(world, building);
  } else applyFacilityAction(world, building, action);
}
/** What demolishing gives back: three quarters of the cost, scaled by how much of the building is left. */
export function salvageOf(building: Building): Partial<ProductInventory> {
  const result: Partial<ProductInventory> = {};
  for (const p of PRODUCTS) {
    const amount = (buildingCost(building)[p] ?? 0) * 0.75 * buildingHealth(building) / 100;
    if (amount > 0) result[p] = amount;
  }
  return result;
}

/** Why a building cannot be taken down right now, or null. */
/** Nothing stops a building coming down. Kept so callers have one place to ask; see `demolishLoss` for the warning. */
/** The most buildings any base can hold (the top Headquarters level). Saves are checked against it. */
export const MAX_BUILDINGS = MOST_BUILDINGS;

export function demolishError(_world: WorldState, building: Building): string | null {
  return isHq(building) ? 'The Headquarters cannot be taken down.' : null;
}

/** What would not fit in the stores that are left if this building came down: materials by name, and ore in kg. */
export function demolishOverflow(world: WorldState, building: Building): { products: Partial<Record<Product, number>>; ore: number } {
  const colony = world.colony;
  const remaining = { ...colony, buildings: colony.buildings.filter(b => b.id !== building.id) };
  const salvage = salvageOf(building);
  const cap = productCapacity(remaining);
  const products: Partial<Record<Product, number>> = {};
  for (const p of PRODUCTS) {
    // Stock already above the stores (from an earlier loss) is not this building's doing.
    const before = Math.min(colony.products[p], Math.max(cap, productCapacity(colony)));
    const over = before + (salvage[p] ?? 0) - Math.max(cap, 0);
    if (over > 1e-6 && productCapacity(colony) > cap - 1e-9) products[p] = over;
  }
  const ore = Math.max(0, inventoryMass(world.depot) - oreCapacity(remaining));
  return { products, ore: oreCapacity(colony) > oreCapacity(remaining) ? ore : 0 };
}

/** The warning to show before demolishing, in one line, or null when nothing would be lost. */
export function demolishLoss(world: WorldState, building: Building): string | null {
  const { products, ore } = demolishOverflow(world, building);
  const parts = PRODUCTS.filter(p => (products[p] ?? 0) >= 0.5).map(p => `${Math.round(products[p]!)} ${p}`);
  if (ore >= 0.5) parts.push(`${Math.round(ore)} kg of ore`);
  return parts.length ? `Not enough storage without it: ${parts.join(', ')} will be lost.` : null;
}

/** Takes a building down and returns the salvage. Whatever no longer fits in the stores is lost. */
export function demolishBuilding(world: WorldState, building: Building): void {
  const colony = world.colony;
  const salvage = salvageOf(building);
  const loss = demolishLoss(world, building);
  const { products, ore } = demolishOverflow(world, building);
  ventHabitat(world, building);
  drainShield(world, building);
  colony.buildings = colony.buildings.filter(b => b.id !== building.id);
  if (world.defence.controlled === building.id) world.defence.controlled = null;
  for (const p of PRODUCTS) colony.products[p] = Math.max(0, colony.products[p] + (salvage[p] ?? 0) - (products[p] ?? 0));
  if (ore > 0) {
    // Ore is lost evenly across what is in the depot.
    const keep = Math.max(0, 1 - ore / inventoryMass(world.depot));
    for (const r of RESOURCES) world.depot[r] *= keep;
  }
  colony.energy = Math.min(colony.energy, energyCapacity(colony));
  notify(world, loss ? `Building demolished. ${loss.replace('will be lost', 'lost')}` : 'Building demolished. You got part of the materials back.', loss ? 6 : 3);
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
    if (isHq(building)) { notify(world, 'THE HEADQUARTERS STAYS ON'); return; }
    if (building.kind === 'storage' || building.kind === 'battery') { notify(world, 'PASSIVE CAPACITY · NO POWER SWITCH'); return; }
    building.enabled = !building.enabled; notify(world, building.enabled ? 'FACILITY ENABLED' : 'FACILITY DISABLED');
  }
}
export function recipeFor(building: Building): Recipe | null {
  return building.kind === 'refinery' ? REFINERY_RECIPES[building.recipe] : building.kind === 'fuelProcessor' ? FUEL_RECIPE : null;
}
/** One machine's step on whatever grid `world.colony.energy` currently is. Returns whether research was staffed. */
function runMachine(world: WorldState, building: Building, dt: number, researchStaffed: boolean): boolean {
  const colony = world.colony;
  if (isHabitat(building.kind) || isShield(building.kind)) return researchStaffed;
  // The Headquarters is not a machine: it stands, holds, and is the base's centre.
  if (isHq(building)) {
    building.status = operational(building) ? 'running' : 'wrecked';
    return researchStaffed;
  }
  const before = building.status;
  building.status = !operational(building) ? 'wrecked' : building.enabled ? 'idle' : 'disabled';
  if (!operational(building)) return researchStaffed;
  if (!building.enabled) return researchStaffed;
  if (building.kind === 'researchLab') { return stepResearch(world, building, dt, researchStaffed) || researchStaffed; }
  // A machine from before warm-up existed (an older save) is taken as already running, so it settles like the rest.
  if (needsBoot(building.kind) && building.boot === undefined && (world.rootWorld ?? world).system.sun) building.boot = BOOT_SECONDS;
  if (needsBoot(building.kind) && !bootStep(world, building, dt)) {
    // A running machine riding out a short gap in power keeps showing what it was doing.
    if (building.status === 'idle' && isOnline(building)) building.status = before;
    return researchStaffed;
  }
  if (building.kind === 'observatory') { stepObservatory(world, building, dt); return researchStaffed; }
  if (building.kind === 'condenser') { stepCondenser(world, building, dt); return researchStaffed; }
  if (building.kind === 'massDriver') { stepMassDriver(world, building, dt); return researchStaffed; }
  if (building.kind === 'workshop') { stepWorkshop(world, building, dt); return researchStaffed; }
  if (building.kind === 'antenna') { stepAntenna(world, building, dt); return researchStaffed; }
  if (building.kind === 'tugBay') { stepTugBay(world, building, dt, oreCapacity(colony)); return researchStaffed; }
  if (building.kind === 'droneBay') { stepMinerDrone(world, building, dt, oreCapacity(colony)); return researchStaffed; }
  if (building.kind === 'miningRig') { stepMiningRig(world, building, dt, oreCapacity(colony)); return researchStaffed; }
  if (building.kind === 'refinery' && !selectScheduledRecipe(world, building, productCapacity(colony))) return researchStaffed;
  const recipe = recipeFor(building); if (!recipe) return researchStaffed;
  if (!hasRecipeInputs(world, recipe)) { building.status = 'no feedstock'; return researchStaffed; }
  if (!hasRecipeRoom(colony.products, recipe, productCapacity(colony))) { building.status = 'output full'; return researchStaffed; }
  const work = dt * powerFraction(building) * workFactor(building); building.requestedPower = recipe.power * powerFraction(building) * workFactor(building);
  if (!work) { building.status = 'power limited'; return researchStaffed; }
  colony.demand += building.requestedPower;
  const block = industrialPowerBlock(colony, recipe.power * work);
  if (block) { building.status = block; return researchStaffed; }
  colony.energy = Math.max(0, colony.energy - recipe.power * work); building.gridPower = recipe.power * powerFraction(building) * workFactor(building); building.progress += work; building.status = 'running';
  if (building.progress + 1e-9 < recipe.seconds) return researchStaffed;
  building.progress = 0;
  for (const [r, quantity] of Object.entries(recipe.raw)) world.depot[r as keyof typeof world.depot] = Math.max(0, world.depot[r as keyof typeof world.depot] - quantity);
  for (const [p, quantity] of Object.entries(recipe.input)) colony.products[p as keyof ProductInventory] = Math.max(0, colony.products[p as keyof ProductInventory] - quantity);
  for (const [p, quantity] of Object.entries(recipe.output)) colony.products[p as keyof ProductInventory] += quantity;
  if (building.kind === 'refinery' && building.schedule?.enabled) building.schedule.cursor = (building.recipe + 1) % REFINERY_RECIPES.length;
  return researchStaffed;
}

/**
 * A group of buildings out of reach of the pad but with its own solar or battery runs as a small separate grid: its
 * batteries hold its own charge, its panels feed it, and its machines draw from it. The base's store is untouched.
 */
function runIsland(world: WorldState, island: Building[], dt: number, panel: (b: Building) => number, researchStaffed: boolean): boolean {
  const colony = world.colony;
  const batteries = island.filter(b => b.kind === 'battery' && operational(b));
  const capacity = batteries.reduce((sum, b) => sum + BATTERY_CAPACITY * capacityFactor(b), 0);
  const solars = island.filter(b => isGenerator(b.kind) && b.enabled && operational(b));
  const generation = solars.reduce((sum, b) => sum + panel(b), 0);
  for (const b of solars) b.gridPower = b.requestedPower = panel(b);
  let pool = batteries.reduce((sum, b) => sum + (b.charge ?? 0), 0);
  pool = Math.min(capacity, pool + generation * dt);
  const saved = { energy: colony.energy, demand: colony.demand, generation: colony.generation };
  colony.energy = pool;
  colony.demand = 0;
  colony.generation = generation;
  for (const building of orderedBuildings({ ...colony, buildings: island })) {
    building.island = true;
    researchStaffed = runMachine(world, building, dt, researchStaffed);
  }
  pool = colony.energy;
  colony.energy = saved.energy;
  colony.demand = saved.demand;
  colony.generation = saved.generation;
  for (const b of batteries) b.charge = capacity > 0 ? (pool * BATTERY_CAPACITY * capacityFactor(b)) / capacity : 0;
  return researchStaffed;
}

export function stepColony(world: WorldState, dt: number, researchStaffed = false): boolean {
  stepConstruction(world, dt);
  const colony = world.colony;
  for (const b of colony.buildings) { b.gridPower = 0; b.requestedPower = 0; }
  const wired = linkedBuildings(world);
  // A battery cut off from the base takes its share of the stored power with it; one that rejoins brings its charge back.
  const capBefore = energyCapacity(colony);
  for (const b of colony.buildings) {
    const now = wired === null || wired.has(b.id) ? undefined : false;
    if (b.kind === 'battery' && operational(b) && b.linked !== false && now === false && capBefore > 0) {
      const share = colony.energy * (BATTERY_CAPACITY * capacityFactor(b)) / capBefore;
      colony.energy -= share;
      b.charge = share;
    }
    b.linked = now;
    b.island = undefined;
  }
  for (const b of colony.buildings) {
    if (b.kind !== 'battery' || b.linked === false || !b.charge) continue;
    const room = Math.max(0, energyCapacity(colony) - colony.energy);
    const back = Math.min(room, b.charge);
    colony.energy += back;
    b.charge = b.charge - back > 1e-9 ? b.charge - back : undefined;
  }
  // Panels follow the sun: full power in daylight, none at night.
  const panel = (b: Building): number => generatorOutput(world, b);
  const sources = colony.buildings.filter(b => isGenerator(b.kind) && b.enabled && operational(b) && b.linked !== false);
  const raw = new Map(sources.map(b => [b.id, panel(b)]));
  const delivered = deliverPower(world, raw);
  colony.generation = sources.reduce((sum, b) => sum + (delivered.get(b.id) ?? 0), 0);
  for (const b of sources) {
    b.requestedPower = raw.get(b.id) ?? 0;
    b.gridPower = delivered.get(b.id) ?? 0;
  }
  colony.energy = Math.min(energyCapacity(colony), colony.energy + colony.generation * dt);
  colony.demand = 0;
  // Machines past a relay get only what the relay can carry, a little less for each hop.
  const feeds = feedLimits(world, b => (b.enabled && operational(b) && b.linked !== false ? ratedPower(b) : 0), delivered);
  for (const b of colony.buildings) b.feed = feeds.has(b.id) ? feeds.get(b.id) : undefined;
  stepHabitats(world, dt, true);
  maintainShields(world, dt);
  chargeHabitats(world, dt);
  chargeShields(world, dt);
  const islands = islandGroups(world);
  const onIsland = new Set(islands.flat().map(b => b.id));
  for (const building of orderedBuildings(colony)) {
    if (onIsland.has(building.id)) continue;
    if (building.linked === false && operational(building) && building.enabled && !isHabitat(building.kind) && !isShield(building.kind)) {
      building.status = 'no power';
      continue;
    }
    researchStaffed = runMachine(world, building, dt, researchStaffed);
  }
  for (const island of islands) researchStaffed = runIsland(world, island, dt, panel, researchStaffed);
  return researchStaffed;
}
