import { nearestPlanet, planetAt, relative, relativeVelocity, surfacePosition, groundVelocity } from './celestial';
import { WORLD } from './config';
import { createShip, IDLE, stepShip, type Ship } from './physics';
import { PRODUCTS, type ProductInventory } from './colonyConfig';
import { availableProduct } from './colonyPolicy';
import { cargoMass } from './shipMass';
import { cargoCapacity, fuelCapacity } from './shipStats';
import { RESOURCES } from './resources';
import { length } from './math';
import { notify } from './messages';
import type { WorldState } from './world';

/**
 * Pilots are printed bodies. Losing one is a setback, not the end: the base prints a new pilot (and a basic lander if
 * the old one is gone) from its stores. A lost lander is not deleted. It stays where it came to rest, or keeps falling,
 * orbiting or drifting away under the same physics, carrying what survived. Its transponder shows it on the Map for
 * an hour; fly or walk up to it and press E to salvage.
 */
export const WRECK = {
  /** Seconds the transponder keeps transmitting. */
  beacon: 3600,
  /** A wreck this far from Selene is gone for good. */
  lostDistance: 60000,
  /** How close a ship must be (metres) and how slowly it must move relative to the wreck (m/s) to salvage. */
  shipReach: 40,
  shipSpeed: 5,
  /** How close a pilot on foot must be. */
  suitReach: 14,
  /** On foot, your lander must be parked this close to the wreck to load what you take. */
  landerReach: 70,
  /** Printing a pilot alone, and a pilot with a basic lander. */
  pilotCost: { alloy: 2 } as Partial<ProductInventory>,
  landerCost: { alloy: 6, components: 2 } as Partial<ProductInventory>,
  /** Materials recoverable from the frame of a wreck in perfect condition. */
  scrap: { alloy: 4, wire: 2, components: 1 } as Partial<ProductInventory>,
  /** A new basic lander starts with this share of a full tank. */
  newFuel: 0.6,
} as const;

export interface Wreck {
  id: number;
  /** The lost lander, still under physics (state 'crashed'). Its cargo, freight and fuel are what can be salvaged. */
  ship: Ship;
  /** When the transponder stops (simulation seconds). */
  beaconUntil: number;
  /** Share of the contents that survived, 0 to 1. */
  condition: number;
  /** How it was lost, in words, for the Map. */
  cause: string;
}

/** How much survived, from how hard it hit. A gentle crash keeps most of the cargo; a fast one keeps little. */
export function crashCondition(ship: Ship): number {
  if (ship.ground) {
    const speed = ship.crashSpeed ?? 20;
    return Math.max(0.25, Math.min(0.9, 1 - Math.max(0, speed - 8) / 40));
  }
  return 0.6;
}

function scale<T extends object>(stock: T, k: number): T {
  const out = { ...stock } as Record<string, number>;
  for (const key of Object.keys(out)) out[key] = Math.round(out[key] * k * 100) / 100;
  return out as T;
}

function canPay(world: WorldState, cost: Partial<ProductInventory>): string | null {
  for (const p of PRODUCTS) {
    const need = cost[p] ?? 0;
    if (need > 0 && availableProduct(world.colony, p) < need) return `Needs ${need} ${p} (you have ${Math.floor(availableProduct(world.colony, p))})`;
  }
  return null;
}

function pay(world: WorldState, cost: Partial<ProductInventory>): void {
  for (const p of PRODUCTS) world.colony.products[p] -= cost[p] ?? 0;
}

/** What printing would cost right now, and why it cannot happen, if it cannot. */
export function printPlan(world: WorldState): { lander: boolean; cost: Partial<ProductInventory>; blocked: string | null } | null {
  const lander = world.ship.state === 'crashed';
  const pilotLost = world.astronaut.health <= 0;
  if (!lander && !pilotLost) return null;
  const cost: Partial<ProductInventory> = { ...WRECK.pilotCost };
  if (lander) for (const p of PRODUCTS) cost[p] = (cost[p] ?? 0) + (WRECK.landerCost[p] ?? 0);
  return { lander, cost, blocked: canPay(world, cost) };
}

/** Print a new pilot at the base, and a basic lander if the old one is lost. The old lander becomes a wreck. */
export function printPilot(world: WorldState): boolean {
  const plan = printPlan(world);
  if (!plan) {
    notify(world, 'Your pilot and lander are fine.');
    return false;
  }
  if (plan.blocked) {
    notify(world, `Printing a new pilot: ${plan.blocked}.`);
    return false;
  }
  pay(world, plan.cost);
  const home = planetAt('home', world.system);
  if (plan.lander) {
    const old = world.ship;
    const condition = crashCondition(old);
    const wreck: Ship = { ...old, cargo: scale(old.cargo, condition), freight: scale(old.freight, condition), fuel: old.fuel * condition, thrusting: false };
    for (const p of PRODUCTS) wreck.freight[p] += Math.round((WRECK.scrap[p] ?? 0) * condition * 100) / 100;
    world.wrecks.push({
      id: world.nextId++,
      ship: wreck,
      beaconUntil: world.system.time + WRECK.beacon,
      condition,
      cause: old.ground ? 'Crashed' : 'Destroyed in flight',
    });
    const fresh = createShip();
    fresh.ground = 'home';
    fresh.position = surfacePosition(home, 0, WORLD.shipRadius);
    fresh.velocity = groundVelocity(home, fresh.position);
    fresh.angle = home.spin;
    fresh.fuel = fuelCapacity(fresh) * WRECK.newFuel;
    world.ship = fresh;
  }
  world.astronaut.health = 100;
  world.astronaut.oxygen = 180;
  world.astronaut.jumpHeld = false;
  world.astronaut.grounded = true;
  world.crewOrder = null;
  world.defence.controlled = null;
  world.colony.buildOpen = false;
  world.depotOpen = false;
  const atPad = length(relative(world.ship.position, home)) - home.radius < WORLD.shipRadius + 1 && world.ship.state === 'landed';
  if (atPad || plan.lander) {
    world.playerMode = 'ship';
    world.astronaut.position = { ...world.ship.position };
    world.astronaut.velocity = { ...world.ship.velocity };
  } else {
    world.playerMode = 'astronaut';
    world.astronaut.position = surfacePosition(home, 0, 2.5);
    world.astronaut.velocity = groundVelocity(home, world.astronaut.position);
  }
  notify(world, plan.lander
    ? 'A new pilot and a basic lander are ready on the pad. The old lander is on the Map while its transponder lasts.'
    : 'A new pilot is ready at the base.');
  return true;
}

/** Wrecks keep moving under the same physics as a lost lander, and are gone once far enough away. */
export function stepWrecks(world: WorldState, dt: number): void {
  if (world.wrecks.length === 0) return;
  for (const w of world.wrecks) stepShip(w.ship, IDLE, dt, world.system);
  const home = planetAt('home', world.system);
  const kept = world.wrecks.filter(w => length(relative(w.ship.position, home)) < WORLD.radius + WRECK.lostDistance);
  if (kept.length < world.wrecks.length) notify(world, 'A wreck has drifted out of reach. It is gone.');
  world.wrecks = kept;
}

/** Whether there is anything left on a wreck. */
const empty = (w: Wreck): boolean =>
  RESOURCES.every(r => w.ship.cargo[r] <= 1e-6) && PRODUCTS.every(p => w.ship.freight[p] <= 1e-6) && w.ship.fuel <= 1e-6 && w.ship.equipment.length === 0 && !w.ship.towRig;

/** The wreck within reach of the player, if any, and why the nearest one is not, otherwise. */
export function reachableWreck(world: WorldState): { wreck: Wreck; reason: string | null } | null {
  const piloting = world.playerMode === 'ship';
  const at = piloting ? world.ship.position : world.astronaut.position;
  const velocity = piloting ? world.ship.velocity : world.astronaut.velocity;
  let best: { wreck: Wreck; distance: number } | null = null;
  for (const wreck of world.wrecks) {
    const distance = Math.hypot(at.x - wreck.ship.position.x, at.y - wreck.ship.position.y);
    if (!best || distance < best.distance) best = { wreck, distance };
  }
  if (!best) return null;
  const reach = piloting ? WRECK.shipReach : WRECK.suitReach;
  if (best.distance > reach * 3) return null;
  if (best.distance > reach) return { wreck: best.wreck, reason: `Get closer (${Math.round(best.distance)} m)` };
  const relative = Math.hypot(velocity.x - best.wreck.ship.velocity.x, velocity.y - best.wreck.ship.velocity.y);
  if (piloting && relative > WRECK.shipSpeed) return { wreck: best.wreck, reason: `Match its speed (${relative.toFixed(1)} m/s apart)` };
  if (!piloting && world.astronaut.health <= 0) return { wreck: best.wreck, reason: 'Your pilot is lost' };
  // On foot you load what you strip into your own lander, so it has to be parked close by.
  const lander = Math.hypot(world.ship.position.x - best.wreck.ship.position.x, world.ship.position.y - best.wreck.ship.position.y);
  if (!piloting && (world.ship.state !== 'landed' || lander > WRECK.landerReach)) return { wreck: best.wreck, reason: 'Land your lander next to it first' };
  return { wreck: best.wreck, reason: null };
}

/** Moves what fits from the nearest reachable wreck into the lander. Returns true if a wreck was in reach (handled the key). */
export function salvageWreck(world: WorldState): boolean {
  const near = reachableWreck(world);
  if (!near || near.reason) {
    if (near?.reason) notify(world, `Wreck: ${near.reason}.`);
    return !!near;
  }
  const from = near.wreck.ship;
  const to = world.ship;
  let room = cargoCapacity(to) - cargoMass(to);
  let moved = 0;
  for (const r of RESOURCES) {
    const take = Math.max(0, Math.min(from.cargo[r], room));
    from.cargo[r] -= take; to.cargo[r] += take; room -= take; moved += take;
  }
  for (const p of PRODUCTS) {
    const take = Math.max(0, Math.min(from.freight[p], room));
    from.freight[p] -= take; to.freight[p] += take; room -= take; moved += take;
  }
  // Fitted modules come off whole and go back on the new lander, if it has none of its own yet.
  let modules = 0;
  if (from.equipment.length > 0 && to.equipment.length === 0) { to.equipment = [...from.equipment]; modules = from.equipment.length; from.equipment = []; }
  if (from.towRig && !to.towRig) { to.towRig = true; from.towRig = false; modules++; }
  const fuel = Math.max(0, Math.min(from.fuel, fuelCapacity(to) - to.fuel));
  from.fuel -= fuel; to.fuel += fuel;
  if (empty(near.wreck)) {
    world.wrecks = world.wrecks.filter(w => w !== near.wreck);
    notify(world, `Salvaged ${Math.round(moved)} kg and ${Math.round(fuel)} kg of fuel. Nothing left on the wreck.`);
  } else if (moved + fuel <= 1e-6 && modules === 0) {
    notify(world, 'Your hold is full. Unload at the pad and come back for the rest.');
  } else {
    notify(world, `Salvaged ${Math.round(moved)} kg and ${Math.round(fuel)} kg of fuel. More is left; your hold is full.`);
  }
  return true;
}

/** Whether a wreck is falling, on the ground, in orbit round the nearest body, or leaving. */
export function wreckCourse(world: WorldState, wreck: Wreck): 'on the ground' | 'in orbit' | 'drifting away' | 'falling' {
  if (wreck.ship.ground) return 'on the ground';
  const body = nearestPlanet(wreck.ship.position, world.system);
  const r = length(relative(wreck.ship.position, body));
  const v = relativeVelocity(wreck.ship.velocity, body);
  const energy = (v.x * v.x + v.y * v.y) / 2 - body.mu / r;
  if (energy >= 0) return 'drifting away';
  // Bound: an orbit if its lowest point clears the ground and air, otherwise it will come down.
  const radial = (relative(wreck.ship.position, body).x * v.x + relative(wreck.ship.position, body).y * v.y) / r;
  const tangential = Math.sqrt(Math.max(0, v.x * v.x + v.y * v.y - radial * radial));
  const a = -body.mu / (2 * energy);
  const angular = r * tangential;
  const e = Math.sqrt(Math.max(0, 1 - angular * angular / (body.mu * a)));
  return a * (1 - e) > body.radius + body.atmosphere ? 'in orbit' : 'falling';
}
