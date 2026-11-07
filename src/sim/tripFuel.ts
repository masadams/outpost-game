import { nearestPlanet } from './celestial';
import { WORLD } from './config';
import { destination } from './exploration';
import type { Destination } from './explorationConfig';
import { shipMass } from './shipMass';
import type { WorldState } from './world';

/** Rough share of extra fuel a pilot spends hovering, turning and correcting, on top of the ideal burn. */
export const PILOT_MARGIN = 3;

/**
 * A rough guide to the fuel for a trip from where the ship is to a place: climbing out of where you are, matching the
 * target's speed, and coming down onto it, with a generous margin for real flying. It is an estimate, not a promise.
 */
export function tripFuel(w: WorldState, key: Destination): { kg: number; dv: number } {
  const from = nearestPlanet(w.ship.position, w.system);
  const to = destination(w, key);
  const toBody = nearestPlanet(to.position, w.system);
  const leave = Math.sqrt((2 * from.mu) / from.radius);
  const arrive = toBody.id === from.id && Math.hypot(to.position.x - toBody.position.x, to.position.y - toBody.position.y) < toBody.radius + 50
    ? Math.sqrt((2 * toBody.mu) / toBody.radius)
    : 0;
  const match = Math.hypot(to.velocity.x - w.ship.velocity.x, to.velocity.y - w.ship.velocity.y);
  const dv = leave + match + (toBody.id !== from.id ? Math.sqrt((2 * toBody.mu) / toBody.radius) : arrive);
  const exhaust = WORLD.thrust / WORLD.burnRate;
  const ideal = shipMass(w.ship) * (1 - Math.exp(-dv / exhaust));
  return { kg: ideal * PILOT_MARGIN, dv };
}
