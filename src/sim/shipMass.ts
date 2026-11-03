import { WORLD } from './config';
import { ammunitionMass } from './combatConfig';
import { inventoryMass } from './resources';
import type { Ship } from './physics';
import { TOW } from './towingConfig';
export const shipMass = (ship: Ship): number => WORLD.dryMass + ship.fuel + inventoryMass(ship.cargo) + ammunitionMass(ship.armament) + (ship.towRig ? TOW.mass : 0);
