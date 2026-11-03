import type { ExplorationState } from './explorationConfig';
import type { Ship } from './physics';
import { RESOURCES, inventoryMass, type Inventory } from './resources';
import { oreCapacity, type Colony } from './colony';

export interface CargoDepot { ship: Ship; depot: Inventory; unloaded: number; colony?: Colony; exploration?: Pick<ExplorationState, 'salvaged' | 'returned'> }
export function unloadCargo(world: CargoDepot): number {
  if (world.ship.state !== 'landed') return 0;
  let mass = 0;
  for (const resource of RESOURCES) {
    const room = world.colony ? Math.max(0, oreCapacity(world.colony) - inventoryMass(world.depot)) : Infinity;
    const quantity = Math.min(world.ship.cargo[resource], room);
    world.depot[resource] += quantity; mass += quantity; world.ship.cargo[resource] -= quantity;
  }
  world.unloaded += mass;
  if (mass > 0 && world.exploration?.salvaged) world.exploration.returned = true;
  return mass;
}
