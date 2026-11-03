import { ATMOSPHERE, WORLD } from './config';
import { heading, length, localAngle, type Vec } from './math';
export type BodyId = 'home' | 'moon';
export interface SystemFrame { time: number; binary: boolean }
export const STATIC_SYSTEM: SystemFrame = { time: 0, binary: false };
export const CELESTIAL = {
  home: { label: 'Selene', radius: WORLD.radius, mu: WORLD.mu, atmosphere: ATMOSPHERE.height },
  moon: { label: 'Nacre', radius: 450, mu: 1.6 * 450 ** 2, atmosphere: 0 },
} as const;
export const SEPARATION = 9500;
export const ORBIT_RATE = Math.sqrt((CELESTIAL.home.mu + CELESTIAL.moon.mu) / SEPARATION ** 3);
export interface Planet { id: BodyId; label: string; radius: number; mu: number; atmosphere: number; position: Vec; velocity: Vec }
export function planetAt(id: BodyId, system = STATIC_SYSTEM): Planet {
  const spec = CELESTIAL[id];
  if (!system.binary) return { ...spec, id, position: { x: id === 'home' ? 0 : SEPARATION, y: 0 }, velocity: { x: 0, y: 0 } };
  const offset = SEPARATION * CELESTIAL.moon.mu / (CELESTIAL.home.mu + CELESTIAL.moon.mu);
  const arm = id === 'home' ? -offset : SEPARATION - offset, phase = system.time * ORBIT_RATE;
  return { ...spec, id, position: { x: offset + arm * Math.cos(phase), y: arm * Math.sin(phase) }, velocity: { x: -arm * ORBIT_RATE * Math.sin(phase), y: arm * ORBIT_RATE * Math.cos(phase) } };
}
export const planets = (system = STATIC_SYSTEM): Planet[] => (system.binary ? ['home', 'moon'] as const : ['home'] as const).map(id => planetAt(id, system));
export const relative = (position: Vec, planet: Planet): Vec => ({ x: position.x - planet.position.x, y: position.y - planet.position.y });
export const relativeVelocity = (velocity: Vec, planet: Planet): Vec => ({ x: velocity.x - planet.velocity.x, y: velocity.y - planet.velocity.y });
export function nearestPlanet(position: Vec, system = STATIC_SYSTEM): Planet {
  return planets(system).sort((a, b) => length(relative(position, a)) - a.radius - (length(relative(position, b)) - b.radius))[0];
}
export function surfacePosition(planet: Planet, angle: number, height = 0): Vec {
  const n = heading(angle); return { x: planet.position.x + n.x * (planet.radius + height), y: planet.position.y + n.y * (planet.radius + height) };
}
// Kept independent of physics.ts so terrain sweeps can be shared by every actor without a cycle.
export function circleHit(start: Vec, end: Vec, radius: number): number | null {
  const dx = end.x - start.x, dy = end.y - start.y, c = start.x ** 2 + start.y ** 2 - radius ** 2;
  if (c < -1e-6 || c <= 1e-6 && start.x * dx + start.y * dy < 0) return 0;
  const a = dx ** 2 + dy ** 2, b = 2 * (start.x * dx + start.y * dy), d = b * b - 4 * a * c;
  if (a === 0 || d < 0) return null;
  const t = (-b - Math.sqrt(d)) / (2 * a); return t >= 0 && t <= 1 ? t : null;
}
export interface TerrainContact { t: number; planet: Planet; normal: Vec; angle: number }
export function terrainHit(start: Vec, end: Vec, radius: number, system = STATIC_SYSTEM, dt = 0): TerrainContact | null {
  let best: TerrainContact | null = null;
  for (const planet of planets(system)) {
    const next = planetAt(planet.id, { ...system, time: system.time + dt });
    const a = relative(start, planet), b = relative(end, next), t = circleHit(a, b, planet.radius + radius);
    if (t === null || best && t >= best.t) continue;
    const angle = localAngle({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    best = { t, planet: next, normal: heading(angle), angle };
  }
  return best;
}
export const clearTerrain = (a: Vec, b: Vec, system = STATIC_SYSTEM): boolean => terrainHit(a, b, 0, system) === null;
