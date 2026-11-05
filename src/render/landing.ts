import type { Ship } from '../sim/physics';
import { telemetry } from '../sim/physics';
import { nearestPlanet, relative, type SystemFrame } from '../sim/celestial';
import { WORLD } from '../sim/config';
import type { Vec } from '../sim/math';

export interface GroundBelow {
  /** Where the ground is directly under the lander. */
  point: Vec;
  /** Points away from the ground, level with the sky. */
  up: Vec;
  /** Metres from the feet to the ground. */
  altitude: number;
}

/** The patch of ground under the ship. Render-only; reads the world, never changes it. */
export function groundBelow(ship: Pick<Ship, 'position' | 'velocity' | 'angle'>, system: SystemFrame): GroundBelow {
  const planet = nearestPlanet(ship.position, system);
  const offset = relative(ship.position, planet);
  const distance = Math.hypot(offset.x, offset.y) || 1;
  const up = { x: offset.x / distance, y: offset.y / distance };
  const point = { x: planet.position.x + up.x * planet.radius, y: planet.position.y + up.y * planet.radius };
  return { point, up, altitude: telemetry(ship, WORLD.shipRadius, system).altitude };
}

/** How hard the engine is blowing dust, 0 (none) to 1 (right at the ground). */
export function dustStrength(altitude: number, thrusting: boolean): number {
  if (!thrusting) return 0;
  const reach = 30;
  return Math.max(0, Math.min(1, 1 - altitude / reach));
}
