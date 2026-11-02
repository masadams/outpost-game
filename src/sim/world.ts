import { moveBody, separateBodies, collideShip, type Asteroid, type Pickup } from './bodies';
import { WORLD } from './config';
import { heading } from './math';
import { fireLaser, fracture, tractor, type Beam } from './mining';
import { createShip, stepShip, type Controls, type Ship } from './physics';
import { emptyInventory, RESOURCES, type Inventory } from './resources';
import { unloadCargo } from './cargo';
export { unloadCargo } from './cargo';
import { createAstronaut, stepAstronaut, SUIT, type Astronaut } from './astronaut';
import { boardOrExit, interactSurface, nearbyStation } from './surface';

export interface WorldControls extends Controls { mine?: boolean; tractor?: boolean; unload?: boolean; board?: boolean; jump?: boolean }
export interface WorldState {
  ship: Ship; asteroids: Asteroid[]; pickups: Pickup[]; depot: Inventory;
  beam: Beam | null; tractorActive: boolean; nextId: number; unloaded: number;
  playerMode: 'ship' | 'astronaut'; astronaut: Astronaut; depotOpen: boolean;
  buttons: { board: boolean; interact: boolean }; notice: { message: string; time: number };
}
export function createWorld(): WorldState {
  const asteroids: Asteroid[] = [];
  for (let i = 0; i < 15; i++) {
    const radius = 1100 + (i % 3) * 160, n = heading(i * 2.399963);
    const speed = Math.sqrt(WORLD.mu / radius);
    asteroids.push({ id: i + 1, position: { x: n.x * radius, y: n.y * radius },
      velocity: { x: -n.y * speed, y: n.x * speed }, radius: 16 + i % 4 * 3,
      mass: 40 + i % 4 * 8, resource: RESOURCES[i % RESOURCES.length], stage: 0, health: 1, maxHealth: 1 });
  }
  // A radial iron sample above home makes the first sortie accessible without orbital rendezvous.
  asteroids[0].position = { x: 0, y: -1040 }; asteroids[0].velocity = { x: 0, y: 0 };
  return { ship: createShip(), asteroids, pickups: [], depot: emptyInventory(), beam: null, tractorActive: false, nextId: 16, unloaded: 0,
    playerMode: 'ship', astronaut: createAstronaut(), depotOpen: false, buttons: { board: false, interact: false }, notice: { message: '', time: 0 } };
}
export function stepWorld(world: WorldState, input: WorldControls, dt: number): void {
  world.notice.time = Math.max(0, world.notice.time - dt);
  if (input.board && !world.buttons.board) boardOrExit(world);
  const interact = !!input.unload && !world.buttons.interact;
  world.buttons = { board: !!input.board, interact: !!input.unload };
  const piloting = world.playerMode === 'ship';
  const startShip = { ...world.ship.position };
  const starts = new Map(world.asteroids.map(rock => [rock.id, { ...rock.position }]));
  stepShip(world.ship, piloting ? input : { thrust: false, turn: 0 }, dt);
  if (!piloting) {
    stepAstronaut(world.astronaut, { move: input.turn, jump: !!input.jump }, dt);
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
  world.beam = piloting && input.mine ? fireLaser(world.ship, world.asteroids, dt) : null;
  const destroyed = world.asteroids.filter(rock => rock.health <= 0);
  world.asteroids = world.asteroids.filter(rock => rock.health > 0);
  for (const rock of destroyed) {
    const children = fracture(rock, () => world.nextId++);
    world.asteroids.push(...children.rocks); world.pickups.push(...children.ore);
  }
  world.tractorActive = piloting && !!input.tractor && world.ship.state === 'flying';
  if (world.tractorActive) for (const pickup of world.pickups) tractor(world.ship, pickup, dt);
  world.pickups = world.pickups.filter(pickup => pickup.mass > 1e-9);
  if (piloting && input.unload) unloadCargo(world);
}
