import { TOW, type TowAction } from './towingConfig';
import { availableProduct } from './colonyPolicy';
import { WORLD } from './config';
import { localAngle, wrap } from './math';
import { surfaceHit } from './physics';
import { shipMass } from './shipMass';
import { notify } from './messages';
import type { WorldState } from './world';

export const isTowAction = (action: { type: string }): action is TowAction => action.type === 'toggleTow' || action.type === 'installTowRig';
export function towInstallationError(w: WorldState): string | null {
  if (w.ship.towRig) return 'Tow rig already fitted';
  if (w.playerMode !== 'ship' || w.ship.state !== 'landed' || Math.abs(Math.hypot(w.ship.position.x, w.ship.position.y) - WORLD.radius - WORLD.shipRadius) > 0.1 || Math.abs(wrap(localAngle(w.ship.position) - WORLD.padAngle)) * WORLD.radius > WORLD.padHalfWidth) return 'Pilot the landed ship on the home pad to fit a tow rig';
  if (Object.entries(TOW.cost).some(([p, q]) => availableProduct(w.colony, p as keyof typeof TOW.cost) + 1e-9 < q)) return 'Needs 16 unreserved alloy + 6 wire + 3 components';
  return null;
}
export function releaseTow(w: WorldState, broken = false, reason = ''): void {
  if (w.towing.targetId === null) return;
  w.towing.targetId = null; w.towing.length = 0; w.towing.tension = 0;
  if (broken) w.towing.breaks++;
  notify(w, reason || (broken ? 'TOW CABLE LOST · TARGET REMAINS IN THE WORLD' : 'TOW RELEASED · ROCK RETAINS ITS MOMENTUM'));
}
export function applyTowAction(w: WorldState, action: TowAction): void {
  if (action.type === 'installTowRig') {
    const error = towInstallationError(w); if (error) { notify(w, error); return; }
    for (const [p, q] of Object.entries(TOW.cost)) w.colony.products[p as keyof typeof TOW.cost] = Math.max(0, w.colony.products[p as keyof typeof TOW.cost] - q);
    w.ship.towRig = true; notify(w, 'TOW RIG FITTED · +25 kg · Y LATCH / RELEASE WHILE FLYING'); return;
  }
  if (w.towing.targetId !== null) { releaseTow(w); return; }
  if (!w.ship.towRig || w.playerMode !== 'ship' || w.ship.state !== 'flying') { notify(w, 'FIT A TOW RIG AT HOME, THEN Y WHILE PILOTING IN FLIGHT'); return; }
  const candidates = w.asteroids.filter(r => r.health > 0).map(rock => ({ rock, distance: Math.hypot(rock.position.x - w.ship.position.x, rock.position.y - w.ship.position.y) }))
    .filter(v => v.distance >= v.rock.radius + WORLD.shipRadius + 2 && v.distance <= TOW.range &&
      Math.hypot(v.rock.velocity.x - w.ship.velocity.x, v.rock.velocity.y - w.ship.velocity.y) <= TOW.relativeSpeed && surfaceHit(w.ship.position, v.rock.position, WORLD.radius) === null)
    .sort((a, b) => a.distance - b.distance || a.rock.id - b.rock.id);
  const target = candidates[0];
  if (!target) { notify(w, 'NO SAFE TOW TARGET · WITHIN 180 m · MATCH VELOCITY TO 15 m/s · CLEAR THE TERRAIN'); return; }
  w.towing.targetId = target.rock.id; w.towing.length = Math.max(TOW.minimumLength, target.distance); w.towing.tension = 0;
  notify(w, 'TOW LATCHED · FIXED-LENGTH CABLE · GENTLE THRUST · Y RELEASES');
}
export function resolveTow(w: WorldState): void {
  if (w.towing.targetId === null) return;
  const target = w.asteroids.find(r => r.id === w.towing.targetId && r.health > 0);
  if (!target || !w.ship.towRig || w.ship.state === 'crashed' || w.ship.impact > 0.8) { releaseTow(w, true); return; }
  const distance = Math.hypot(target.position.x - w.ship.position.x, target.position.y - w.ship.position.y);
  if (distance > w.towing.length + TOW.stretch || surfaceHit(w.ship.position, target.position, WORLD.radius) !== null) releaseTow(w, true, 'TOW SNAPPED · OVERSTRETCH OR TERRAIN OCCLUSION');
}
/** Equal/opposite cable impulses. Slack never pushes, and damping dissipates relative motion. */
export function stepTow(w: WorldState, dt: number): void {
  resolveTow(w); const tow = w.towing;
  const rock = w.asteroids.find(r => r.id === tow.targetId); if (!rock) return;
  const dx = rock.position.x - w.ship.position.x, dy = rock.position.y - w.ship.position.y, distance = Math.hypot(dx, dy);
  const extension = distance - tow.length;
  tow.tension = 0; if (distance < 1e-9 || extension <= 0) return;
  const nx = dx / distance, ny = dy / distance;
  const separation = (rock.velocity.x - w.ship.velocity.x) * nx + (rock.velocity.y - w.ship.velocity.y) * ny;
  const force = Math.max(0, TOW.spring * extension + TOW.damping * separation);
  if (force > TOW.breakForce) { releaseTow(w, true, 'TOW SNAPPED · EXCESSIVE TENSION'); return; }
  tow.tension = force; const impulse = force * dt;
  // A landed ship is anchored to the planet; that anchor takes the opposing impulse.
  if (w.ship.state === 'flying') { const mass = shipMass(w.ship); w.ship.velocity.x += nx * impulse / mass; w.ship.velocity.y += ny * impulse / mass; }
  rock.velocity.x -= nx * impulse / rock.mass; rock.velocity.y -= ny * impulse / rock.mass;
}
