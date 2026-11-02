import { createSurfaceDeposits, type SurfaceDeposit } from './geology';
import { createCombat, type CombatState, type CombatAction } from './combatConfig';
import { applyCombatAction, isCombatAction, stepCombat } from './combat';
import { serviceCombatAtPad } from './combatSupply';
import { createDefence, type DefenceState } from './defenceConfig';
import { controlledTurret, stepDefence, applyDefenceAction, isDefenceAction, resolveDefenceHits } from './defence';
import { moveBody, separateBodies, collideShip, type Asteroid, type Pickup } from './bodies';
import { ATMOSPHERE, WORLD } from './config';
import { heading } from './math';
import { fireLaser, fracture, tractor, type Beam } from './mining';
import { createShip, stepShip, type Controls, type Ship } from './physics';
import { emptyInventory, RESOURCES, type Inventory } from './resources';
import { unloadCargo } from './cargo';
export { unloadCargo } from './cargo';
import { createAstronaut, stepAstronaut, SUIT, type Astronaut } from './astronaut';
import { boardOrExit, interactSurface, nearbyStation } from './surface';
import { createColony, applyColonyAction, stepColony, type Colony, type ColonyAction } from './colony';
import { refuelShip } from './colonyService';
import { notify } from './messages';

export interface WorldControls extends Controls { combatFire?: boolean; combatActions?: CombatAction[]; mine?: boolean; tractor?: boolean; unload?: boolean; board?: boolean; jump?: boolean; colonyActions?: ColonyAction[] }
export interface WorldState {
  ship: Ship; asteroids: Asteroid[]; pickups: Pickup[]; depot: Inventory;
  beam: Beam | null; tractorActive: boolean; nextId: number; unloaded: number;
  playerMode: 'ship' | 'astronaut'; astronaut: Astronaut; depotOpen: boolean;
  buttons: { board: boolean; interact: boolean }; notice: { message: string; time: number };
  surfaceDeposits: SurfaceDeposit[]; colony: Colony; defence: DefenceState; combat: CombatState;
}
export function createWorld(): WorldState {
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
  return { ship: createShip(), asteroids, pickups: [], depot: emptyInventory(), beam: null, tractorActive: false, nextId: 16, unloaded: 0,
    playerMode: 'ship', astronaut: createAstronaut(), depotOpen: false, buttons: { board: false, interact: false }, notice: { message: '', time: 0 }, surfaceDeposits: createSurfaceDeposits(), colony: createColony(), defence: createDefence(), combat: createCombat() };
}
export function stepWorld(world: WorldState, input: WorldControls, dt: number): void {
  world.notice.time = Math.max(0, world.notice.time - dt);
  if (input.board && !world.buttons.board) { world.defence.controlled = null; boardOrExit(world); }
  for (const action of input.colonyActions ?? []) {
    if (isCombatAction(action)) applyCombatAction(world, action); else if (isDefenceAction(action)) applyDefenceAction(world, action); else applyColonyAction(world, action);
  }
  for (const action of input.combatActions ?? []) applyCombatAction(world, action);
  const interact = !!input.unload && !world.buttons.interact;
  world.buttons = { board: !!input.board, interact: !!input.unload };
  const piloting = world.playerMode === 'ship';
  const startSuit = { ...world.astronaut.position }, meteorStarts = new Map(world.defence.meteors.map(m => [m.id, { ...m.position }]));
  const startShip = { ...world.ship.position };
  const starts = new Map(world.asteroids.map(rock => [rock.id, { ...rock.position }]));
  stepShip(world.ship, piloting ? input : { thrust: false, turn: 0 }, dt);
  if (!piloting) {
    const controlling = !!controlledTurret(world);
    stepAstronaut(world.astronaut, { move: controlling ? 0 : input.turn, jump: !controlling && !!input.jump }, dt);
    if (nearbyStation(world)?.kind !== 'depot') world.depotOpen = false;
    if (interact) interactSurface(world);
  } else {
    world.astronaut.position = { ...world.ship.position }; world.astronaut.velocity = { ...world.ship.velocity };
    world.astronaut.oxygen = SUIT.oxygen;
  }
  for (const body of [...world.asteroids, ...world.pickups]) moveBody(body, dt);
  for (let i = 0; i < world.asteroids.length; i++) {
    const rock = world.asteroids[i];
    for (let j = i + 1; j < world.asteroids.length; j++) separateBodies(rock, world.asteroids[j]);
    collideShip(world.ship, rock, startShip, starts.get(rock.id)!);
  }
  world.beam = piloting && input.mine ? fireLaser(world.ship, [...world.asteroids, ...world.defence.meteors], dt) : null;
  resolveMinedRocks(world);
  world.tractorActive = piloting && !!input.tractor && world.ship.state === 'flying';
  if (world.tractorActive) for (const pickup of world.pickups) tractor(world.ship, pickup, dt);
  world.pickups = world.pickups.filter(pickup => pickup.mass > 1e-9);
  if (piloting && input.unload) {
    unloadCargo(world);
    serviceCombatAtPad(world);
    const fuel = refuelShip(world, world.ship.position);
    if (fuel > 0) notify(world, `FUEL TRANSFERRED · +${fuel.toFixed(1)} kg`);
  }
  stepColony(world, dt);
  stepDefence(world, !!input.mine, input.turn, dt, startShip);
  stepCombat(world, !!input.combatFire, dt, { ship: startShip, suit: startSuit, rocks: starts, meteors: meteorStarts });
  resolveDefenceHits(world);
  if (world.asteroids.some(rock => rock.health <= 0)) resolveMinedRocks(world);
}

function resolveMinedRocks(world: WorldState): void {
  const destroyed = world.asteroids.filter(rock => rock.health <= 0);
  world.asteroids = world.asteroids.filter(rock => rock.health > 0);
  for (const rock of destroyed) {
    const children = fracture(rock, () => world.nextId++);
    world.asteroids.push(...children.rocks); world.pickups.push(...children.ore);
  }
}
