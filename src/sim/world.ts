import { onWater } from './nature';
import {createAutopilot,type AutopilotState} from './autopilotConfig';
import {applyAutopilotAction,autopilotControls,stopAutopilot} from './autopilot';
import {applyBuildingUpgrade} from './buildingUpgrades';
import { applyCrewOrder, crewMove, type CrewOrder } from './crewOrders';
import { createObjectives, observeObjectives, type ObjectiveState } from './objectives';
import { planetAt, nearestPlanet, surfaceAngle, CELESTIAL, BODY_IDS, type SystemFrame, type BodyId } from './celestial';
import { activeWorld, allColonies, colonyPlanet, colonyWorld, localAngleAt } from './localWorld';
import { isProgressionAction } from './progressionConfig';
import { applyResearch } from './research';
import { applyEquipment } from './equipment';
import { createExploration, isExplorationAction, type ExplorationState } from './explorationConfig';
import { stepProbes } from './probes';
import { applySupplyAction, isSupplyAction, stepSupply } from './supply';
import { chooseExpedition, isExpeditionAction, launchExpedition, stepExpedition } from './expedition';
import { isSignalAction, launchBeacon, stepSignal } from './signal';
import { isPodAction, sendPod, stepBeacons, stepPods } from './pods';
import { createEvents, stepEvents } from './events';
import { stepDrift } from './drift';
import { stepBlueprintNotices } from './blueprintNotice';
import { stepStory } from './story';
import { stepKeystones } from './keystones';
import { applySeedShipAction, isSeedShipAction } from './seedShip';
import { stepStarHeat } from './starHazard';
import { seedNeighborhood, stepSites, resolveSites, applyExplorationAction } from './exploration';
import { applyCommandAction } from './command';
import { isCommandAction } from './commandConfig';
import { createSurfaceDeposits, type SurfaceDeposit } from './geology';
import { consumeHabitatAir } from './habitats';
import { createTowing, type TowingState } from './towingConfig';
import { applyTowAction, isTowAction, resolveTow, stepTow } from './towing';
import { createCombat, type CombatState, type CombatAction } from './combatConfig';
import { applyCombatAction, isCombatAction, stepCombat } from './combat';
import { serviceCombatAtPad } from './combatSupply';
import { createDefence, type DefenceState } from './defenceConfig';
import { createStorm, type StormState } from './stormConfig';
import { isCrystalAction, applyCrystalAction, stepCrystal, isCoreAction, applyCoreAction, stepCore } from './crystal';
import { stepStorm, isStormAction, applyStormAction } from './storm';
import { salvageWreck, stepWrecks, type Wreck } from './wrecks';
import { bagToHold, collectOnFoot } from './bag';
import { ROCK_SHATTER_SPEED, rockToOre } from './rockFall';
import { controlledTurret, stepDefence, applyDefenceAction, isDefenceAction, resolveDefenceHits } from './defence';
import { moveBody, separateBodies, collideShip, type Asteroid, type Pickup } from './bodies';
import { ATMOSPHERE, WORLD } from './config';
import { heading, wrap } from './math';
import { fireLaser, fracture, tractor, powerTractor, type Beam } from './mining';
import { createShip, stepShip, type Controls, type Ship } from './physics';
import { emptyInventory, inventoryMass, RESOURCES, type Inventory } from './resources';
import { unloadCargo as unloadDepot } from './cargo';
import { unloadFreight } from './freight';
import { createAstronaut, stepAstronaut, SUIT, type Astronaut } from './astronaut';
import { boardOrExit, interactSurface, nearbyStation } from './surface';
import { createColony, applyColonyAction, stepColony, type Colony, type ColonyAction } from './colony';
import { refuelShip } from './colonyService';
import { notify } from './messages';
export function unloadCargo(world: WorldState): number { return unloadDepot(colonyWorld(world, nearestPlanet(world.ship.position, world.system).id)); }

export interface WorldControls extends Controls { combatFire?: boolean; combatActions?: CombatAction[]; mine?: boolean; tractor?: boolean; unload?: boolean; board?: boolean; jump?: boolean; colonyActions?: ColonyAction[] }
/** Everything a body other than the home planet keeps for itself. */
export interface Outpost { colony: Colony; depot: Inventory; surfaceDeposits: SurfaceDeposit[] }
export type OutpostId = Exclude<BodyId, 'home'>;

export interface WorldState {
  autopilot:AutopilotState;
  crewOrder: CrewOrder|null;
  objectives: ObjectiveState;
  system: SystemFrame;
  /** The colony, stores and ground deposits on every body other than the home planet. */
  outposts: Record<OutpostId, Outpost>;
  /** Seed for the layout of the world. 0 is the standard layout; any other value varies deposits and rocks, repeatably. */
  seed: number;
  /** Only local views expose these; never persisted on the root. */
  readonly siteBody?: BodyId; readonly rootWorld?: WorldState;
  exploration: ExplorationState;
  towing: TowingState;
  ship: Ship; asteroids: Asteroid[]; pickups: Pickup[]; depot: Inventory;
  beam: Beam | null; tractorActive: boolean; nextId: number; unloaded: number;
  playerMode: 'ship' | 'astronaut'; astronaut: Astronaut; depotOpen: boolean;
  buttons: { board: boolean; interact: boolean }; notice: { message: string; time: number };
  surfaceDeposits: SurfaceDeposit[]; colony: Colony; defence: DefenceState; storm: StormState; wrecks: Wreck[]; combat: CombatState;
}
/** An empty outpost for every body but the home planet. Ids on each start at a different thousand so they never clash. */
function createOutposts(seed: number): Record<OutpostId, Outpost> {
  const outposts = {} as Record<OutpostId, Outpost>;
  BODY_IDS.filter((id): id is OutpostId => id !== 'home').forEach((id, i) => {
    const colony = createColony();
    for (const p of Object.keys(colony.products) as (keyof typeof colony.products)[]) colony.products[p] = 0;
    colony.nextId = 1001 + 1000 * i;
    outposts[id] = { colony, depot: emptyInventory(), surfaceDeposits: createSurfaceDeposits(CELESTIAL[id].radius, id, seed) };
  });
  return outposts;
}

/** Research is shared by every colony: one tree, one set of finished projects. */
export function shareResearch(world: WorldState): void {
  for (const outpost of Object.values(world.outposts)) outpost.colony.research = world.colony.research;
}

export function createWorld(seed = 0): WorldState {
  const asteroids: Asteroid[] = [];
  for (let i = 0; i < 15; i++) {
    const radius = WORLD.radius + ATMOSPHERE.height + 400 + (i % 3) * 200, n = heading(i * 2.399963);
    const speed = Math.sqrt(WORLD.mu / radius);
    asteroids.push({ id: i + 1, position: { x: n.x * radius, y: n.y * radius },
      velocity: { x: -n.y * speed, y: n.x * speed }, radius: 16 + i % 4 * 3,
      mass: 40 + i % 4 * 8, resource: RESOURCES[i % RESOURCES.length], stage: 0, health: 1, maxHealth: 1 });
  }
  // A radial iron sample above home makes the first sortie accessible without orbital rendezvous.
  asteroids[0].position = { x: 0, y: -WORLD.radius - 440 }; asteroids[0].velocity = { x: 0, y: 0 };
  asteroids[2].position = { x: 95, y: -WORLD.radius - 470 }; asteroids[2].velocity = { x: 0, y: 0 };
  const world: WorldState = { autopilot:createAutopilot(),crewOrder:null, objectives: createObjectives(), system: { time: 0, binary: true, ...(seed !== 0 ? { seed } : {}) }, seed, outposts: createOutposts(seed), exploration: { ...createExploration(), ...(seed !== 0 ? { events: createEvents() } : {}) }, towing: createTowing(), ship: createShip(), asteroids, pickups: [], depot: emptyInventory(), beam: null, tractorActive: false, nextId: 16, unloaded: 0,
    playerMode: 'ship', astronaut: createAstronaut(), depotOpen: false, buttons: { board: false, interact: false }, notice: { message: '', time: 0 }, surfaceDeposits: createSurfaceDeposits(undefined, 'home', seed), colony: createColony(), defence: createDefence(), storm: createStorm(), wrecks: [], combat: createCombat() };
  shareResearch(world);
  seedNeighborhood(world);
  const velocity = planetAt('home', world.system).velocity;
  for (const actor of [world.ship, world.astronaut, ...world.asteroids, ...world.exploration.sites]) { actor.velocity.x += velocity.x; actor.velocity.y += velocity.y; }
  return world;
}
export function stepWorld(world: WorldState, input: WorldControls, dt: number): void {
  world.notice.time = Math.max(0, world.notice.time - dt);
  const local = activeWorld(world);
  if (input.board && !world.buttons.board) { world.crewOrder=null; world.defence.controlled = null; boardOrExit(local); }
  for (const action of input.colonyActions ?? []) {
    const owner = action.body ? colonyWorld(world, action.body) : local;
    if(action.type==='autopilot'){applyAutopilotAction(world,action);continue;}
    if(action.type==='upgradeBuilding'){applyBuildingUpgrade(owner,action);continue;}
    if(action.type==='crewOrder'){applyCrewOrder(owner,action);continue;}
    if(isStormAction(action)){applyStormAction(world,action);continue;}
    if(isCrystalAction(action)){applyCrystalAction(world);continue;}
    if(isCoreAction(action)){applyCoreAction(world);continue;}
    if (isSeedShipAction(action)) {
      applySeedShipAction(world, action);
      continue;
    }
    if(isPodAction(action)){sendPod(world,action.from,action.to);continue;}
    if(isSignalAction(action)){launchBeacon(world);continue;}
    if(isSupplyAction(action)){applySupplyAction(world,action);continue;}
    if(isExpeditionAction(action)){if(action.type==='launchExpedition')launchExpedition(world,action.kit,action.target??null);else chooseExpedition(world,action.choice);continue;}
    if(action.type==='salvageWreck'){salvageWreck(world);continue;}
    if (isProgressionAction(action)) { if (action.type === 'equipment') applyEquipment(owner, action); else applyResearch(owner, action); } else if (isExplorationAction(action)) applyExplorationAction(world, action); else if (isCommandAction(action)) applyCommandAction(owner, action); else if (isTowAction(action)) applyTowAction(owner, action); else if (isCombatAction(action)) applyCombatAction(owner, action); else if (isDefenceAction(action)) applyDefenceAction(owner, action); else applyColonyAction(owner, action);
  }
  for (const action of input.combatActions ?? []) applyCombatAction(local, action);
  stepTow(world, dt);
  let interact = !!input.unload && !world.buttons.interact;
  // E next to a wreck salvages it, before anything else E might do.
  if (interact && salvageWreck(world)) interact = false;
  world.buttons = { board: !!input.board, interact: !!input.unload };
  const piloting = world.playerMode === 'ship';
  const startSuit = { ...world.astronaut.position }, meteorStarts = new Map(world.defence.meteors.map(m => [m.id, { ...m.position }]));
  const startShip = { ...world.ship.position };
  const starts = new Map([...world.asteroids, ...world.exploration.sites].map(rock => [rock.id, { ...rock.position }]));
  const flightInput=autopilotControls(world,input,dt);
  const landingsBefore = world.ship.landings;
  stepShip(world.ship, piloting ? flightInput : { thrust: false, turn: 0 }, dt, world.system);
  if (world.ship.landings > landingsBefore && world.ship.ground) {
    const body = planetAt(world.ship.ground, world.system);
    if (onWater(body.id, world.seed, surfaceAngle(body, world.ship.position))) notify(world, 'SPLASHDOWN · THE LANDER FLOATS · NOTHING CAN BE BUILT ON WATER');
  }
  let paidHabitatSeconds = 0;
  if (!piloting) {
    const controlling = !!controlledTurret(local);
    const automatic=crewMove(world,input.turn!==0||!!input.jump||!!input.board);
    paidHabitatSeconds = consumeHabitatAir(local, dt);
    stepAstronaut(world.astronaut, { move: controlling ? 0 : input.turn || automatic, jump: !controlling && !!input.jump }, dt, paidHabitatSeconds, world.system);
    if (nearbyStation(local)?.kind !== 'depot') world.depotOpen = false;
    if (interact) interactSurface(local);
    collectOnFoot(world);
  } else {
    // Whatever the pilot carried in goes into the hold.
    if (world.astronaut.bag && inventoryMass(world.astronaut.bag) > 0) { const moved = bagToHold(world); if (moved > 0) notify(world, `Moved ${moved.toFixed(1)} kg of ore from your bag to the hold.`); }
    world.astronaut.position = { ...world.ship.position }; world.astronaut.velocity = { ...world.ship.velocity };
    world.astronaut.oxygen = SUIT.oxygen;
  }
  const shattered: Asteroid[] = [];
  for (const body of world.pickups) moveBody(body, dt, world.system);
  for (const rock of world.asteroids) if (moveBody(rock, dt, world.system) > ROCK_SHATTER_SPEED) shattered.push(rock);
  // A rock that comes down hard breaks into loose ore on the ground (same mass), instead of landing on the pad as an obstacle.
  if (shattered.length > 0) {
    world.asteroids = world.asteroids.filter(r => !shattered.includes(r));
    for (const rock of shattered) world.pickups.push(...rockToOre(rock, () => world.nextId++, world.system));
  }
  for (let i = 0; i < world.asteroids.length; i++) {
    const rock = world.asteroids[i];
    for (let j = i + 1; j < world.asteroids.length; j++) separateBodies(rock, world.asteroids[j]);
    collideShip(world.ship, rock, startShip, starts.get(rock.id)!);
  }
  stepSites(world, dt, startShip);
  stepProbes(world, dt);
  stepPods(world);
  stepBeacons(world);
  stepStory(world);
  stepBlueprintNotices(world);
  stepEvents(world, dt);
  stepDrift(world, dt);
  stepSignal(world);
  stepExpedition(world);
  stepSupply(world);
  stepStarHeat(world, dt);
  world.beam = piloting && input.mine ? fireLaser(world.ship, [...world.asteroids, ...world.defence.meteors, ...world.exploration.sites], dt, world.system) : null;
  resolveMinedRocks(world);
  world.tractorActive = piloting && !!input.tractor && world.ship.state === 'flying' && powerTractor(world.ship, dt);
  if (world.tractorActive) for (const pickup of world.pickups) tractor(world.ship, pickup, dt, world.system);
  world.pickups = world.pickups.filter(pickup => pickup.mass > 1e-9);
  if (piloting && interact && world.ship.state === 'flying') applyExplorationAction(world, { type: 'visitSite' });
  if (piloting && input.unload) {
    // Ore only goes to the depot from the pad, not from wherever the lander happens to sit.
    const atPad = Math.abs(wrap(localAngleAt(local, world.ship.position) - WORLD.padAngle)) * colonyPlanet(local).radius <= WORLD.padHalfWidth;
    if (atPad) unloadCargo(local);
    if (atPad && colonyPlanet(local).id !== 'home') {
      const kit = unloadFreight(local);
      if (kit > 0) notify(world, `KIT UNLOADED · ${kit.toFixed(0)} kg. Step out and build.`);
    }
    serviceCombatAtPad(local);
    const fuel = refuelShip(local, world.ship.position);
    if (fuel > 0) notify(world, `FUEL TRANSFERRED · +${fuel.toFixed(1)} kg`);
  }
  let researchStaffed = false;
  for (const site of allColonies(world)) researchStaffed = stepColony(site, dt, researchStaffed);
  stepStorm(world);
  stepCrystal(world);
  stepCore(world);
  stepKeystones(world);
  stepWrecks(world, dt);
  stepDefence(world, !!input.mine, input.turn, dt, startShip);
  stepCombat(world, !!input.combatFire, dt, { ship: startShip, suit: startSuit, rocks: starts, meteors: meteorStarts });
  resolveDefenceHits(world);
  if (world.asteroids.some(rock => rock.health <= 0)) resolveMinedRocks(world);
  resolveTow(world); resolveSites(world);
  if(world.autopilot.program&&world.ship.state==='crashed')stopAutopilot(world,'Ship lost');
  world.system.time += dt;
  if(world.crewOrder&&(world.playerMode!=='astronaut'||!world.astronaut.grounded||world.astronaut.health<=0))world.crewOrder=null;
  observeObjectives(world, paidHabitatSeconds);
}

function resolveMinedRocks(world: WorldState): void {
  const destroyed = world.asteroids.filter(rock => rock.health <= 0);
  world.asteroids = world.asteroids.filter(rock => rock.health > 0);
  for (const rock of destroyed) {
    const children = fracture(rock, () => world.nextId++);
    world.asteroids.push(...children.rocks); world.pickups.push(...children.ore);
  }
}
