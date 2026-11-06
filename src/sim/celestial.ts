import { ATMOSPHERE, DAY_LENGTH, WORLD } from './config';
import { heading, length, localAngle, wrap, type Vec } from './math';
export const BODY_IDS = ['home', 'moon', 'cinder'] as const;
export type BodyId = typeof BODY_IDS[number];
/** `sun` switches the day and night cycle on; without it every place is always in full daylight. */
export interface SystemFrame { time: number; binary: boolean; sun?: boolean }
export const STATIC_SYSTEM: SystemFrame = { time: 0, binary: false };
/**
 * How a body moves. `pair` bodies circle a shared centre with a partner (Selene and Nacre do): `role` says which end.
 * `spin`: 'day' turns once per day; 'tidal' turns once per orbit so the same face looks at its partner.
 * `requiresBinary` bodies only exist when the two-body system is switched on.
 */
export interface BodySpec {
  label: string; radius: number; mu: number; atmosphere: number;
  orbit: { kind: 'pair'; partner: BodyId; role: 'primary' | 'secondary' }
    | { kind: 'circle'; radius: number; phase: number };
  spin: 'day' | 'tidal';
  requiresBinary: boolean;
  /** Seconds a powered Observatory must watch before this body is surveyed and shows on the Map. 0 means known from the start. */
  surveySeconds: number;
}
/** Every body in the system, as data. Add a body here and the rest of the physics (gravity, landing, light) follows. */
export const BODIES: Record<BodyId, BodySpec> = {
  home: { label: 'Selene', radius: WORLD.radius, mu: WORLD.mu, atmosphere: ATMOSPHERE.height,
    orbit: { kind: 'pair', partner: 'moon', role: 'primary' }, spin: 'day', requiresBinary: false, surveySeconds: 0 },
  moon: { label: 'Nacre', radius: 450, mu: 1.6 * 450 ** 2, atmosphere: 0,
    orbit: { kind: 'pair', partner: 'home', role: 'secondary' }, spin: 'tidal', requiresBinary: true, surveySeconds: 90 },
  // A small airless world far out, circling the shared centre of Selene and Nacre. Faint: it takes long watching to find.
  cinder: { label: 'Cinder', radius: 260, mu: 0.9 * 260 ** 2, atmosphere: 0,
    orbit: { kind: 'circle', radius: 22000, phase: 2.2 }, spin: 'tidal', requiresBinary: true, surveySeconds: 420 },
};
/** The size, gravity and air of each body (the older name for the catalogue's physical fields). */
export const CELESTIAL = BODIES;
export const SEPARATION = 9500;
export const ORBIT_RATE = Math.sqrt((BODIES.home.mu + BODIES.moon.mu) / SEPARATION ** 3);
/**
 * `spin` is how far the planet has turned (radians, added to surface angles to get world angles) and `spinRate` how fast it turns.
 * Planets turn only when the day cycle is on: Selene once per day, Nacre once per orbit so the same face looks at Selene.
 */
export interface Planet { id: BodyId; label: string; radius: number; mu: number; atmosphere: number; position: Vec; velocity: Vec; spin: number; spinRate: number }
/** Selene turns so its star crosses the sky from the pad's left to its right, once per day. */
export const HOME_SPIN_RATE = -2 * Math.PI / DAY_LENGTH;
/** Angular speed (rad/s) of a body around its orbit centre. */
export function orbitRate(id: BodyId): number {
  const orbit = BODIES[id].orbit;
  if (orbit.kind === 'pair') return ORBIT_RATE;
  return Math.sqrt((BODIES.home.mu + BODIES.moon.mu) / orbit.radius ** 3);
}
function spinOf(id: BodyId, system: SystemFrame): { spin: number; spinRate: number } {
  if (!system.sun) return { spin: 0, spinRate: 0 };
  const rate = BODIES[id].spin === 'day' ? HOME_SPIN_RATE : system.binary ? orbitRate(id) : 0;
  return { spin: rate * system.time, spinRate: rate };
}
export function planetAt(id: BodyId, system = STATIC_SYSTEM): Planet {
  const body = BODIES[id];
  const { label, radius, mu, atmosphere } = body;
  const spec = { label, radius, mu, atmosphere };
  const turn = spinOf(id, system);
  const orbit = body.orbit;
  const pairMu = BODIES.home.mu + BODIES.moon.mu;
  // The shared centre of Selene and Nacre sits on the line between them, nearer the heavier one.
  const centre = SEPARATION * BODIES.moon.mu / pairMu;
  if (orbit.kind === 'circle') {
    const rate = system.binary ? orbitRate(id) : 0;
    const angle = orbit.phase + rate * system.time;
    return {
      ...spec, id, ...turn,
      position: { x: centre + orbit.radius * Math.cos(angle), y: orbit.radius * Math.sin(angle) },
      velocity: { x: -orbit.radius * rate * Math.sin(angle), y: orbit.radius * rate * Math.cos(angle) },
    };
  }
  const partner = BODIES[orbit.partner];
  const primary = orbit.role === 'primary';
  if (!system.binary) return { ...spec, id, ...turn, position: { x: primary ? 0 : SEPARATION, y: 0 }, velocity: { x: 0, y: 0 } };
  const offset = SEPARATION * (primary ? partner.mu : body.mu) / pairMu;
  const arm = primary ? -offset : SEPARATION - offset;
  const phase = system.time * ORBIT_RATE;
  return {
    ...spec, id, ...turn,
    position: { x: offset + arm * Math.cos(phase), y: arm * Math.sin(phase) },
    velocity: { x: -arm * ORBIT_RATE * Math.sin(phase), y: arm * ORBIT_RATE * Math.cos(phase) },
  };
}
export const planets = (system = STATIC_SYSTEM): Planet[] => BODY_IDS.filter(id => system.binary || !BODIES[id].requiresBinary).map(id => planetAt(id, system));
export const relative = (position: Vec, planet: Planet): Vec => ({ x: position.x - planet.position.x, y: position.y - planet.position.y });
/** The velocity of the ground (and the air, which turns with it) at a point, from the planet's motion and its turning. */
export function groundVelocity(planet: Planet, position: Vec): Vec {
  const r = relative(position, planet);
  return { x: planet.velocity.x - planet.spinRate * r.y, y: planet.velocity.y + planet.spinRate * r.x };
}
/** Velocity relative to the planet: to the ground under a point when `position` is given, otherwise to the planet's centre. */
export const relativeVelocity = (velocity: Vec, planet: Planet, position?: Vec): Vec => {
  const frame = position ? groundVelocity(planet, position) : planet.velocity;
  return { x: velocity.x - frame.x, y: velocity.y - frame.y };
};
/** Where on the planet's surface a point is, as a surface angle (fixed to the ground, turning with the planet). */
export const surfaceAngle = (planet: Planet, position: Vec): number => wrap(localAngle(relative(position, planet)) - planet.spin);
export function nearestPlanet(position: Vec, system = STATIC_SYSTEM): Planet {
  return planets(system).sort((a, b) => length(relative(position, a)) - a.radius - (length(relative(position, b)) - b.radius))[0];
}
export function surfacePosition(planet: Planet, angle: number, height = 0): Vec {
  const n = heading(angle + planet.spin); return { x: planet.position.x + n.x * (planet.radius + height), y: planet.position.y + n.y * (planet.radius + height) };
}
// Kept independent of physics.ts so terrain sweeps can be shared by every actor without a cycle.
export function circleHit(start: Vec, end: Vec, radius: number): number | null {
  const dx = end.x - start.x, dy = end.y - start.y, c = start.x ** 2 + start.y ** 2 - radius ** 2;
  if (c < -1e-6 || c <= 1e-6 && start.x * dx + start.y * dy < 0) return 0;
  const a = dx ** 2 + dy ** 2, b = 2 * (start.x * dx + start.y * dy), d = b * b - 4 * a * c;
  if (a === 0 || d < 0) return null;
  const t = (-b - Math.sqrt(d)) / (2 * a); return t >= 0 && t <= 1 ? t : null;
}
/** `angle` is a surface angle on `planet` (the planet as it is at the end of the step). */
export interface TerrainContact { t: number; planet: Planet; normal: Vec; angle: number }
export function terrainHit(start: Vec, end: Vec, radius: number, system = STATIC_SYSTEM, dt = 0): TerrainContact | null {
  let best: TerrainContact | null = null;
  for (const planet of planets(system)) {
    const next = planetAt(planet.id, { ...system, time: system.time + dt });
    const a = relative(start, planet), b = relative(end, next), t = circleHit(a, b, planet.radius + radius);
    if (t === null || best && t >= best.t) continue;
    const world = localAngle({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    // `angle` is on the ground (it turns with the planet); the normal is in the world.
    // The ground turns during the step: use where it was at the moment of contact, not at the end.
    const spinAtContact = planet.spin + (next.spin - planet.spin) * t;
    best = { t, planet: next, normal: heading(world), angle: wrap(world - spinAtContact) };
  }
  return best;
}
export const clearTerrain = (a: Vec, b: Vec, system = STATIC_SYSTEM): boolean => terrainHit(a, b, 0, system) === null;

/** Turns a point reached `seconds` from now back by however far the planet's ground turns meanwhile: where it falls on the ground as it is now. */
export function onGroundNow(body: BodyId, system: SystemFrame, point: Vec, seconds: number): Vec {
  const now = planetAt(body, system);
  if (!now.spinRate) return { ...point };
  const later = planetAt(body, { ...system, time: system.time + seconds });
  const a = -(later.spin - now.spin), c = Math.cos(a), s = Math.sin(a);
  const v = { x: point.x - later.position.x, y: point.y - later.position.y };
  return { x: now.position.x + v.x * c - v.y * s, y: now.position.y + v.x * s + v.y * c };
}
