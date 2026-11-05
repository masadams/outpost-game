import { planetAt, planets, surfacePosition, type BodyId, type SystemFrame } from './celestial';
import { heading, wrap, type Vec } from './math';

/**
 * The star: a real body with a position, a size and a brightness. Light at any point comes from geometry:
 * the direction to the star, how bright it is at that distance, and whether a moon or planet is in the way.
 *
 * Day and night: the game's world frame is the planet's own surface frame, which does not spin, so the star
 * circles once per day in this frame. That is the only place the day is decided (`starPosition`). When planets
 * get real rotation the frame becomes inertial, the star stops moving, and `starPosition` becomes a fixed point;
 * nothing else here changes, and a ship can then fly toward it.
 */
export const SUN = {
  /** Seconds in a full day on Selene. */
  dayLength: 1000,
  /** Where the star is at time zero, as a bearing from the planet: a new game starts in the morning, in full light. */
  startAngle: -1.1,
  /** The sun's height (−1 to 1) at which a panel gives full power, and at which it gives none. Between is twilight. */
  fullElevation: 0.2,
  zeroElevation: -0.3,
} as const;

export const STAR = {
  label: 'Helia',
  /** Metres from the home system. Far beyond any flight for now; the brightness law below already works for an approach. */
  distance: 3_000_000,
  /** Metres. Seen from the planet it is a small disc, smaller than the moon. */
  radius: 60_000,
} as const;

const TURN = Math.PI * 2;

/** The bearing from the home system toward the star at this time. */
export function sunAngle(time: number): number {
  return wrap(SUN.startAngle + TURN * time / SUN.dayLength);
}

/** Where the star is in the world frame. */
export function starPosition(system: SystemFrame): Vec {
  const n = heading(sunAngle(system.time));
  return { x: n.x * STAR.distance, y: n.y * STAR.distance };
}

export interface Light {
  /** Unit vector from the point toward the star. */
  direction: Vec;
  /** Metres to the star's centre. */
  distance: number;
  /** How high the star is above the local horizon: 1 overhead, 0 on the horizon, −1 straight below. */
  elevation: number;
  /** Brightness relative to the home system: 1 at the usual distance, rising as 1 over distance squared. */
  flux: number;
  /** Share of the star's disc hidden by another body, 0 to 1. */
  eclipse: number;
}

/** Share of a disc of angular radius `a` covered by a disc of angular radius `b` whose centre is `s` away. */
export function discCover(a: number, b: number, s: number): number {
  if (s >= a + b) return 0;
  if (s <= Math.abs(b - a)) return b >= a ? 1 : (b * b) / (a * a);
  const ca = (s * s + a * a - b * b) / (2 * s * a);
  const cb = (s * s + b * b - a * a) / (2 * s * b);
  const lens = a * a * Math.acos(Math.max(-1, Math.min(1, ca))) + b * b * Math.acos(Math.max(-1, Math.min(1, cb)))
    - 0.5 * Math.sqrt(Math.max(0, (-s + a + b) * (s + a - b) * (s - a + b) * (s + a + b)));
  return Math.max(0, Math.min(1, lens / (Math.PI * a * a)));
}

/** The light at a point in the world (for example a spot on a planet's surface, or a ship). `home` is the body the point belongs to, if any. */
export function lightAtPoint(system: SystemFrame, point: Vec, up: Vec | null, ignore?: BodyId): Light {
  const star = starPosition(system);
  const dx = star.x - point.x;
  const dy = star.y - point.y;
  const distance = Math.hypot(dx, dy);
  const direction = { x: dx / distance, y: dy / distance };
  const starRadius = STAR.radius / distance;
  let eclipse = 0;
  for (const body of planets(system)) {
    if (body.id === ignore) continue;
    const cx = body.position.x - point.x;
    const cy = body.position.y - point.y;
    const range = Math.hypot(cx, cy);
    if (range <= body.radius) continue;
    const along = (cx * direction.x + cy * direction.y) / range;
    if (along <= 0) continue;
    const separation = Math.acos(Math.max(-1, Math.min(1, along)));
    eclipse = Math.max(eclipse, discCover(starRadius, Math.asin(Math.min(1, body.radius / range)), separation));
  }
  const elevation = up ? up.x * direction.x + up.y * direction.y : 1;
  return { direction, distance, elevation, flux: (STAR.distance / distance) ** 2, eclipse };
}

/** The light on a planet's surface at a surface angle (and height). The planet itself blocks the star below the horizon, through `elevation`. */
export function lightAt(system: SystemFrame, body: BodyId, angle: number, height = 1): Light {
  const planet = planetAt(body, system);
  return lightAtPoint(system, surfacePosition(planet, angle, height), heading(angle), body);
}
