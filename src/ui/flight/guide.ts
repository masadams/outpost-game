import { nearestPlanet, planetAt, surfacePosition } from '../../sim/celestial';
import { crystalAngle } from '../../sim/crystal';
import type { Vec } from '../../sim/math';
import type { WorldState } from '../../sim/world';

/** A place to point the player at once the first delivery is done: the survey buoy, then the Nacre crystal. */
export function guideTarget(w: WorldState): Vec | null {
  const root = w.rootWorld ?? w;
  if (root.unloaded <= 0) return null;
  const viewer = w.playerMode === 'astronaut' ? w.astronaut.position : w.ship.position;
  if (root.system.sun && !root.exploration.surveyed.includes('frost') && w.playerMode === 'ship' && w.ship.state === 'flying') {
    return root.exploration.sites.find(s => s.key === 'survey')?.position ?? null;
  }
  const onNacre = nearestPlanet(viewer, w.system).id === 'moon';
  if (onNacre && root.exploration.crystal === 'lying') {
    return surfacePosition(planetAt('moon', w.system), crystalAngle(), 0);
  }
  return null;
}
