import { nearestPlanet, planetAt, surfacePosition } from '../../sim/celestial';
import { coreAngle, crystalAngle } from '../../sim/crystal';
import { KEYSTONE_WORLDS, keystoneAngle, keystonesOpen, keystoneState } from '../../sim/keystones';
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
  if (nearestPlanet(viewer, w.system).id === 'cinder' && root.exploration.core === 'lying') {
    return surfacePosition(planetAt('cinder', w.system), coreAngle(), 0);
  }
  // A part of the carrier on the world you are at.
  const here = nearestPlanet(viewer, w.system).id;
  const part = KEYSTONE_WORLDS.find(id => id === here);
  if (part && keystonesOpen(root) && keystoneState(root, part) === 'lying') {
    return surfacePosition(planetAt(part, w.system), keystoneAngle(part, root.seed), 0);
  }
  return null;
}
