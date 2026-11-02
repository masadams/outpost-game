import { WORLD } from './config';
import { ammunitionMass } from './combatConfig';
import { inventoryMass } from './resources';
import type { Ship } from './physics';
export const shipMass = (ship: Ship): number => WORLD.dryMass + ship.fuel + inventoryMass(ship.cargo) + ammunitionMass(ship.armament);
