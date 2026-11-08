import { WORLD } from './config';
import { clamp } from './math';

export const REFERENCE_MASS = WORLD.dryMass + WORLD.fuelCapacity;

/** How briskly the ship turns for its mass: a light ship snaps round, a laden one is sluggish (gentle range). */
export const turnAgility = (mass: number): number =>
  clamp((REFERENCE_MASS / Math.max(1, mass)) ** 0.25, 0.92, 1.08);
