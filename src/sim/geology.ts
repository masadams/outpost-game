import { seasOf } from './nature';
import { CELESTIAL, type BodyId } from './celestial';
import { WORLD } from './config';
import { wrap } from './math';
import { around, streamFor } from './seed';
import type { Resource } from './resources';
import type { Building } from './colony';

export interface SurfaceDeposit {
  id: number; resource: Resource; angle: number; halfWidth: number; initial: number; remaining: number;
  /** How rich the ore is: it sets how fast a rig digs. Missing (older saves) counts as normal. */
  grade?: SeamGrade;
  /** False until someone walks over it or flies low across it. Missing (older saves) counts as surveyed. */
  surveyed?: boolean;
}

export type SeamGrade = 'poor' | 'normal' | 'rich';
/** How much faster or slower a rig digs on each grade. */
export const GRADE_YIELD: Record<SeamGrade, number> = { poor: 0.7, normal: 1, rich: 1.5 };
export const GRADE_LABEL: Record<SeamGrade, string> = { poor: 'Poor', normal: 'Good', rich: 'Rich' };
/** Seams this close to the pad (m) are known from the start; farther ones need surveying. */
export const SURVEYED_NEAR_PAD = 450;
/** How close (m, along the ground past the seam's edge) the pilot on foot must come to survey it. */
export const SURVEY_ON_FOOT = 60;
/** How low (m) and how close (m past the edge) the lander must pass to survey a seam from the air. */
export const SURVEY_FROM_AIR = { height: 350, reach: 120 } as const;

export const seamGrade = (d: SurfaceDeposit): SeamGrade => d.grade ?? 'normal';
export const seamKnown = (d: SurfaceDeposit): boolean => d.surveyed !== false;
export const RIG = { power: 6, seconds: 2, yield: 0.5 } as const;
const SEAMS: readonly [Resource, number, number, number][] = [
  ['iron', 160, 34, 180], ['ice', -180, 40, 120], ['copper', 420, 36, 180],
  ['silicon', 760, 40, 160], ['rareMetals', 1160, 24, 60], ['ice', 2100, 45, 240],
  ['iron', 3200, 48, 360], ['copper', -1700, 40, 300], ['silicon', -3000, 40, 240], ['rareMetals', -4400, 30, 100],
];
/** Cinder: small, and rich where Selene is poor. Rare metals and silicon, nothing else. */
const CINDER_SEAMS: typeof SEAMS = [['rareMetals', 100, 30, 220], ['rareMetals', -250, 30, 180], ['silicon', 380, 36, 200]];

/** Ember: thin air, ice and iron and a little copper. */
const EMBER_SEAMS: typeof SEAMS = [['ice', 90, 34, 200], ['iron', -200, 32, 170], ['copper', 330, 30, 120], ['rareMetals', 560, 26, 70]];

/** Glint: a small ice dwarf, with water on top and a little metal under it. */
const GLINT_SEAMS: typeof SEAMS = [['ice', 60, 34, 260], ['ice', -190, 30, 200], ['iron', 250, 26, 90], ['rareMetals', -320, 20, 50]];

/** Selene's iron in a seeded game is richer than the standard layout: alloy is the metal everything needs most. */
export const HOME_IRON_BOOST = 1.4;

/** Verdant: living ground, iron and copper under the forests. */
const VERDANT_SEAMS: typeof SEAMS = [['iron', 140, 36, 260], ['copper', -220, 34, 200], ['ice', 420, 30, 120], ['silicon', -520, 30, 140]];
/** Tide: a few islands, but rich ones. */
const TIDE_SEAMS: typeof SEAMS = [['iron', 120, 30, 220], ['rareMetals', -150, 26, 120], ['copper', 260, 28, 160]];
/** Murk: under the haze, heavy metals. */
const MURK_SEAMS: typeof SEAMS = [['iron', 150, 40, 320], ['rareMetals', -200, 30, 160], ['silicon', 380, 36, 220], ['copper', -480, 34, 220]];
const BODY_SEAMS: Partial<Record<BodyId, typeof SEAMS>> = { verdant: VERDANT_SEAMS, tide: TIDE_SEAMS, murk: MURK_SEAMS };

/** The first seams near the pad are never made smaller than the standard game: a fair start for every seed. */
const FAIR_SEAMS = 3;

export function createSurfaceDeposits(radius: number = WORLD.radius, body?: BodyId, seed = 0): SurfaceDeposit[] {
  if (body === 'cinder' || body === 'ember' || body === 'glint' || (body && BODY_SEAMS[body])) radius = CELESTIAL[body].radius;
  const seams: typeof SEAMS = body && BODY_SEAMS[body] ? BODY_SEAMS[body]! : body === 'cinder' ? CINDER_SEAMS : body === 'ember' ? EMBER_SEAMS : body === 'glint' ? GLINT_SEAMS : radius === WORLD.radius ? SEAMS : [['ice', 160, 40, 180], ['iron', -180, 34, 160], ['rareMetals', 420, 32, 90], ['silicon', 760, 36, 120], ['copper', -600, 36, 160]];
  // Seed 0 is the standard game. Any other seed varies each seam's size a little, the same way every time.
  const rand = streamFor(seed, `ground/${body ?? 'home'}`);
  return seams.map(([resource, rawArc, halfWidth, initial], i) => {
    const arc = dryArc(body, seed, rawArc, halfWidth, radius);
    if (seed === 0) return { id: i + 1, resource, angle: arc / radius, halfWidth, initial, remaining: initial };
    // Grades come from their own stream, so adding them changed no seam's size or place.
    const roll = streamFor(seed, `grade/${body ?? 'home'}/${i + 1}`)();
    const fair = i < FAIR_SEAMS && (body ?? 'home') === 'home';
    const grade: SeamGrade = roll < 0.25 && !fair ? 'poor' : roll > 0.78 ? 'rich' : 'normal';
    const surveyed = Math.abs(arc) <= SURVEYED_NEAR_PAD;
    const size = i < FAIR_SEAMS && (body ?? 'home') === 'home' ? Math.max(1, around(rand, 0.25)) : around(rand, 0.25);
    const width = around(rand, 0.1);
    const boost = resource === 'iron' && (body ?? 'home') === 'home' && radius === WORLD.radius ? HOME_IRON_BOOST : 1;
    const amount = Math.round(initial * size * boost);
    return {
      id: i + 1, resource, angle: arc / radius, halfWidth: Math.round(halfWidth * width * 10) / 10, initial: amount, remaining: amount,
      grade, surveyed,
    };
  });
}
export const surfaceDistance = (a: number, b: number): number => Math.abs(wrap(a - b)) * WORLD.radius;
export function depositAt(deposits: SurfaceDeposit[], angle: number, footprint = 0, radius: number = WORLD.radius): SurfaceDeposit | undefined {
  return deposits.find(d => Math.abs(wrap(angle - d.angle)) * radius + footprint <= d.halfWidth + 1e-7);
}
export function rigDeposit(deposits: SurfaceDeposit[], building: Building, radius: number = WORLD.radius): SurfaceDeposit | undefined {
  const d = deposits.find(d => d.id === building.depositId);
  return d && Math.abs(wrap(building.angle - d.angle)) * radius + 12 <= d.halfWidth + 1e-7 ? d : undefined;
}

/** A seam that a sea would cover is moved to the nearest dry shore. */
function dryArc(body: BodyId | undefined, seed: number, arc: number, halfWidth: number, radius: number): number {
  if (!body) return arc;
  const angle = arc / radius;
  const sea = seasOf(body, seed).find(x => Math.abs(wrap(angle - x.angle)) <= x.half + halfWidth / radius);
  if (!sea) return arc;
  const side = wrap(angle - sea.angle) >= 0 ? 1 : -1;
  return (sea.angle + side * (sea.half + halfWidth / radius + 0.02)) * radius;
}
