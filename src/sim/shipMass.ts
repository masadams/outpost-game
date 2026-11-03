import { equipmentMass } from './shipStats';
import { WORLD } from './config';
import { ammunitionMass } from './combatConfig';
import { inventoryMass } from './resources';
import type { Ship } from './physics';
import { TOW } from './towingConfig';
export const shipMass = (ship: Ship): number => WORLD.dryMass + equipmentMass(ship) + ship.fuel + cargoMass(ship) + ammunitionMass(ship.armament) + (ship.towRig ? TOW.mass : 0);

export const cargoMass = (ship: Pick<Ship, 'cargo' | 'freight'>): number => inventoryMass(ship.cargo) + Object.values(ship.freight).reduce((a, b) => a + b, 0);
