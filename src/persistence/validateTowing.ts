import { TOW } from '../sim/towingConfig';
import type { WorldState } from '../sim/world';
export function validTowing(w: WorldState): boolean {
  const t = w.towing;
  if (typeof w.ship.towRig !== 'boolean' || !Number.isInteger(t.breaks) || t.breaks < 0 || t.breaks > 1e6 || !Number.isFinite(t.length) || !Number.isFinite(t.tension)) return false;
  if (t.targetId === null) return t.length === 0 && t.tension === 0;
  return w.ship.towRig && w.ship.state !== 'crashed' && Number.isInteger(t.targetId) && w.asteroids.some(r => r.id === t.targetId && r.health > 0) && t.length >= TOW.minimumLength && t.length <= TOW.range && t.tension >= 0 && t.tension <= TOW.breakForce;
}
