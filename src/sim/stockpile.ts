import { notify } from './messages';
import { inventoryMass, RESOURCES, type Resource } from './resources';
import { cargoMass } from './shipMass';
import { cargoCapacity } from './shipStats';
import { colonyPlanet, localAngleAt } from './localWorld';
import { wrap } from './math';
import { policyFor } from './colonyPolicy';
import type { Building } from './colony';
import type { WorldState } from './world';

/**
 * Ore from mines out of reach of the base. A rig or drone bay on the base's grid sends its ore to the depot at the
 * pad; one that is not (on a separate grid, or cut off) piles it beside itself instead, up to a limit, and stops when
 * the pile is full. Join it to the base grid and the pile flows in; or land the lander beside it and load it.
 */
export const STOCKPILE = 150;
/** How close (m along the ground) the landed lander must be to load a pile. */
export const COLLECT_REACH = 90;

export const offGrid = (b: Building): boolean => b.linked === false;
export const pileMass = (b: Building): number => RESOURCES.reduce((sum, r) => sum + (b.stock?.[r] ?? 0), 0);

/** How much more ore this mine can put somewhere right now: the depot for a connected mine, its own pile otherwise. */
export function mineRoom(world: WorldState, b: Building, capacity: number): number {
  if (offGrid(b)) return Math.max(0, STOCKPILE - pileMass(b));
  return capacity - inventoryMass(world.depot) - policyFor(world.colony).deliveryReserve;
}

/** Whether a full mine is full because of its own pile (not the depot). */
export const pileFull = (b: Building): boolean => offGrid(b) && pileMass(b) >= STOCKPILE - 1e-9;

/** Puts mined ore where it goes: the depot, or the mine's own pile when it is off the base grid. */
export function deliverOre(world: WorldState, b: Building, resource: Resource, amount: number): void {
  if (amount <= 0) return;
  if (offGrid(b)) {
    b.stock = { ...(b.stock ?? {}), [resource]: (b.stock?.[resource] ?? 0) + amount };
    return;
  }
  world.depot[resource] += amount;
}

/** Piles at mines that are back on the base grid flow into the depot, as far as there is room. */
export function drainPiles(world: WorldState, capacity: number): void {
  for (const b of world.colony.buildings) {
    if (offGrid(b) || !b.stock) continue;
    for (const r of RESOURCES) {
      const have = b.stock[r] ?? 0;
      if (have <= 0) continue;
      const room = Math.max(0, capacity - inventoryMass(world.depot));
      const move = Math.min(have, room);
      world.depot[r] += move;
      b.stock[r] = have - move;
    }
    if (pileMass(b) <= 1e-9) b.stock = undefined;
  }
}

/** Mines with ore piled beside them close enough to the landed lander to load. */
export function nearbyPiles(world: WorldState): Building[] {
  if (world.ship.state !== 'landed' || world.playerMode !== 'ship') return [];
  const planet = colonyPlanet(world);
  const shipAngle = localAngleAt(world, world.ship.position);
  return world.colony.buildings.filter(b => pileMass(b) > 0.5 && Math.abs(wrap(b.angle - shipAngle)) * planet.radius <= COLLECT_REACH);
}

export type PileAction = { type: 'loadPiles' };
export const isPileAction = (a: { type: string }): a is PileAction => a.type === 'loadPiles';

/** Loads what the hold takes from the piles beside the lander. */
export function loadPiles(world: WorldState): number {
  const piles = nearbyPiles(world);
  if (piles.length === 0) {
    notify(world, 'Land beside a mine with ore piled up to load it.');
    return 0;
  }
  let room = Math.max(0, cargoCapacity(world.ship) - cargoMass(world.ship));
  let moved = 0;
  for (const b of piles) {
    for (const r of RESOURCES) {
      const take = Math.min(b.stock?.[r] ?? 0, room);
      if (take <= 0) continue;
      world.ship.cargo[r] += take;
      b.stock![r] = (b.stock![r] ?? 0) - take;
      room -= take;
      moved += take;
    }
    if (pileMass(b) <= 1e-9) b.stock = undefined;
  }
  notify(world, moved > 0 ? `LOADED ${moved.toFixed(0)} kg FROM THE MINE · FLY IT HOME` : 'Your hold is full.');
  return moved;
}
