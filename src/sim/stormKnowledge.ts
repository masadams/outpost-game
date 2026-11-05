import { WORLD } from './config';
import { wrap } from './math';
import { seeded } from './random';
import { STORM } from './stormConfig';
import type { WorldState } from './world';

/** Seconds of powered scanning before anything is seen at all. */
export const SIGHTING_SECONDS = 15;

export type StormLevel = 'sighted' | 'tracked' | 'precise';

/** What the player can know about the storm, from what the Observatory has watched. Never the exact truth until it is close. */
export interface StormKnowledge {
  level: StormLevel;
  /** Roughly how many bodies, exact once tracked. */
  count: number;
  /** Best guess at seconds until the first impact, and how far off it could be. */
  eta: number;
  etaMargin: number;
  /** Best guess at the impact corridor, metres along the surface from the pad (positive is the colony side), and its half-width. */
  corridor: number;
  corridorMargin: number;
  observed: number;
}

/** How much doubt is left after this many seconds of watching. Falls smoothly; never reaches zero. */
export function etaMargin(observed: number): number {
  return Math.max(5, 120 * Math.exp(-observed / 60));
}
export function corridorMargin(observed: number): number {
  return Math.max(70, 700 * Math.exp(-observed / 70));
}

export function stormKnowledge(w: WorldState): StormKnowledge | null {
  const s = w.storm;
  if (!s.planned || s.phase !== 'approaching' || s.observed < SIGHTING_SECONDS) return null;
  const time = w.system.time;
  const coming = s.plan.filter(p => p.impactTime !== null && p.impactAngle !== null && p.impactTime > time);
  if (coming.length === 0) return null;
  const first = Math.min(...coming.map(p => p.impactTime!));
  const metres = coming.map(p => wrap(p.impactAngle! - WORLD.padAngle) * WORLD.radius);
  const low = Math.min(...metres);
  const high = Math.max(...metres);
  const rand = seeded(STORM.seed + 1);
  // A fixed error for this storm that shrinks as the watching goes on, so the estimate settles instead of jittering.
  const etaError = (rand() * 2 - 1) * 0.6;
  const corridorError = (rand() * 2 - 1) * 0.6;
  const etaDoubt = etaMargin(s.observed);
  const corridorDoubt = corridorMargin(s.observed);
  const level: StormLevel = s.observed < 50 ? 'sighted' : s.observed < 150 ? 'tracked' : 'precise';
  const count = level === 'sighted' ? Math.max(1, Math.round(s.ids.length / 3) * 3) : s.ids.length;
  return {
    level,
    count,
    eta: Math.max(0, first - time + etaError * etaDoubt),
    etaMargin: etaDoubt,
    corridor: (low + high) / 2 + corridorError * corridorDoubt,
    corridorMargin: (high - low) / 2 + corridorDoubt,
    observed: s.observed,
  };
}
