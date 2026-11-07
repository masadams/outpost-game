import { BODIES, SEPARATION, type SystemFrame } from './celestial';
import { lightAtPoint, starPosition, STAR } from './star';
import { notify } from './messages';
import type { Vec } from './math';
import type { WorldState } from './world';

/** Helia's pull, as G·M (m³/s²): 100 m/s² at its surface, far too weak to notice at the planets. */
export const STAR_MU = 3.6e11;
/** Light many times brighter than at home starts to cook the hull. */
export const HEAT_FLUX = 40;
/** Hull lost per second for each step of brightness past the threshold. */
export const HEAT_RATE = 4;

/**
 * Helia's pull on a body, as felt in the home system's own frame. The planets fall around Helia together with everything
 * near them, so only the difference between the pull here and at the home system's centre is felt: almost nothing near
 * the planets, and everything close to the star. Only with the day cycle on, when the star stays put.
 */
export function starTide(position: Vec, system: SystemFrame): Vec {
  if (!system.sun) return { x: 0, y: 0 };
  const star = starPosition(system);
  const pull = (p: Vec): Vec => {
    const dx = star.x - p.x;
    const dy = star.y - p.y;
    const r = Math.max(Math.hypot(dx, dy), STAR.radius);
    const k = STAR_MU / r ** 3;
    return { x: dx * k, y: dy * k };
  };
  const centre = { x: (SEPARATION * BODIES.moon.mu) / (BODIES.home.mu + BODIES.moon.mu), y: 0 };
  const here = pull(position);
  const there = pull(centre);
  return { x: here.x - there.x, y: here.y - there.y };
}

/** How hot Helia's light is on the ship: 0 below the threshold, rising with brightness. */
export function heating(world: WorldState): number {
  if (!world.system.sun) return 0;
  const flux = lightAtPoint(world.system, world.ship.position, null).flux;
  return Math.max(0, flux / HEAT_FLUX - 1);
}

/** Close to Helia the hull cooks; the ship is lost when it is gone. A warning comes as soon as it starts. */
export function stepStarHeat(world: WorldState, dt: number): void {
  const ship = world.ship;
  if (ship.state !== 'flying') return;
  const heat = heating(world);
  if (heat <= 0) return;
  if (!world.notice.message.startsWith('THE HULL IS HEATING')) notify(world, 'THE HULL IS HEATING · HELIA IS TOO CLOSE · TURN AWAY');
  ship.hull = Math.max(0, ship.hull - HEAT_RATE * heat * dt);
  if (ship.hull <= 0) {
    ship.state = 'crashed';
    ship.thrusting = false;
    notify(world, 'THE LANDER BURNED UP NEAR HELIA');
  }
}
