import { SUIT } from './astronaut';
import { cargoMass } from './shipMass';
import { cargoCapacity } from './shipStats';
import { inventoryMass, RESOURCES } from './resources';
import { oreCapacity } from './colony';
import { notify } from './messages';
import type { WorldState } from './world';

/** On foot, walking over loose ore puts it in the sample bag, as far as the bag holds. */
export function collectOnFoot(world: WorldState): void {
  const suit = world.astronaut;
  if (world.playerMode !== 'astronaut' || suit.health <= 0) return;
  let room = SUIT.bagCapacity - inventoryMass(suit.bag);
  if (room <= 1e-6) return;
  let took = 0;
  for (const piece of world.pickups) {
    if (room <= 1e-6) break;
    const d = Math.hypot(piece.position.x - suit.position.x, piece.position.y - suit.position.y);
    if (d > SUIT.pickupReach + piece.radius) continue;
    const take = Math.min(piece.mass, room);
    suit.bag[piece.resource] += take; piece.mass -= take; room -= take; took += take;
  }
  if (took <= 0) return;
  world.pickups = world.pickups.filter(p => p.mass > 1e-9);
  const full = room <= 1e-6 ? ' The bag is full.' : '';
  notify(world, `Picked up ${took.toFixed(1)} kg of ore (bag ${inventoryMass(suit.bag).toFixed(0)}/${SUIT.bagCapacity} kg).${full}`);
}

/** Empties the bag into the lander's hold, as far as it fits. */
export function bagToHold(world: WorldState): number {
  const bag = world.astronaut.bag;
  let room = cargoCapacity(world.ship) - cargoMass(world.ship);
  let moved = 0;
  for (const r of RESOURCES) {
    const take = Math.max(0, Math.min(bag[r], room));
    bag[r] -= take; world.ship.cargo[r] += take; room -= take; moved += take;
  }
  return moved;
}

/** Empties the bag into the base depot, as far as storage allows. */
export function bagToDepot(world: WorldState): number {
  const bag = world.astronaut.bag;
  let room = Math.max(0, oreCapacity(world.colony) - inventoryMass(world.depot));
  let moved = 0;
  for (const r of RESOURCES) {
    const take = Math.max(0, Math.min(bag[r], room));
    bag[r] -= take; world.depot[r] += take; room -= take; moved += take;
  }
  world.unloaded += moved;
  return moved;
}
