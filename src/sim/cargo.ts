import type { Ship } from './physics';
import { RESOURCES, type Inventory } from './resources';

export interface CargoDepot { ship: Ship; depot: Inventory; unloaded: number }
export function unloadCargo(world: CargoDepot): number {
  if (world.ship.state !== 'landed') return 0;
  let mass = 0;
  for (const resource of RESOURCES) {
    const quantity = world.ship.cargo[resource]; world.depot[resource] += quantity; mass += quantity; world.ship.cargo[resource] = 0;
  }
  world.unloaded += mass;
  return mass;
}
