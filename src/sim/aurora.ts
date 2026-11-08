import { BODIES, type BodyId } from './celestial';
import { EVENTS, eventSolarFactor } from './events';
import type { WorldState } from './world';

/** How bright the northern lights are over a world: faint most nights where there is air, blazing during a solar flare. */
export function auroraStrength(w: WorldState, body: BodyId = 'home'): number {
  const root = w.rootWorld ?? w;
  if (!root.system.sun) return 0;
  const air = BODIES[body].air?.surfaceDensity ?? 0;
  if (air <= 0) return 0;
  const flare = eventSolarFactor(root) >= EVENTS.flare.boost - 1e-9;
  return flare ? 1 : 0.3;
}
