import { WORLD, ATMOSPHERE } from './config';
import { planetAt } from './celestial';
import { streamFor } from './seed';
import type { Resource } from './resources';
import type { WorldState } from './world';

/** New rocks keep drifting into Selene's orbit, slowly, so the lander always has something to mine. */
export const DRIFT = {
  /** Seconds between checks. */
  every: 300,
  /** No new rock while this many loose rocks are still circling home. */
  floor: 6,
  /** Iron comes most often: it is the metal the base needs most. */
  weights: [['iron', 0.4], ['copper', 0.2], ['ice', 0.2], ['silicon', 0.15], ['rareMetals', 0.05]] as [Resource, number][],
} as const;

/** Puts a rock in a circular orbit around home, wherever home is now. */
export function orbitRock(w: WorldState, angle: number, altitude: number, resource: Resource, mass: number, radius: number): void {
  const home = planetAt('home', w.system);
  const r = WORLD.radius + altitude;
  const speed = Math.sqrt(WORLD.mu / r);
  const n = { x: Math.cos(angle), y: Math.sin(angle) };
  w.asteroids.push({
    id: w.nextId++,
    position: { x: home.position.x + n.x * r, y: home.position.y + n.y * r },
    velocity: { x: home.velocity.x - n.y * speed, y: home.velocity.y + n.x * speed },
    radius, mass, resource, stage: 0, health: 1, maxHealth: 1,
  });
}

function pick(roll: number): Resource {
  let sum = 0;
  for (const [resource, weight] of DRIFT.weights) {
    sum += weight;
    if (roll < sum) return resource;
  }
  return 'iron';
}

/** Loose rocks near home (not belt rocks, not fragments). */
export const homeRocks = (w: WorldState): number => w.asteroids.filter(a => a.stage === 0 && !a.belt).length;

/** Every few minutes, if home's sky is getting bare, one more rock drifts in. Seeded day-cycle games only. */
export function stepDrift(w: WorldState, dt: number): void {
  if (w.seed === 0 || !w.system.sun) return;
  const t = w.system.time;
  if (Math.floor(t / DRIFT.every) === Math.floor((t - dt) / DRIFT.every)) return;
  if (homeRocks(w) >= DRIFT.floor || w.asteroids.length >= 200) return;
  const rand = streamFor(w.seed, `drift/${Math.floor(t / DRIFT.every)}`);
  const resource = pick(rand());
  const size = 0.85 + rand() * 0.3;
  orbitRock(w, rand() * Math.PI * 2, ATMOSPHERE.height + 400 + rand() * 500, resource, Math.round(48 * size * size), Math.round(18 * size * 10) / 10);
}
