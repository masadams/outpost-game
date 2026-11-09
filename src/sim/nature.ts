import type { BodyId } from './celestial';
import { streamFor } from './seed';
import { wrap } from './math';

/** What a world is like on the ground, beyond its size and air. */
export type WorldKind = 'barren' | 'living' | 'ocean' | 'heavy';

export interface NatureSpec {
  kind: WorldKind;
  /** Share of the surface under water (0 to 1). */
  water: number;
  /** Trees per radian of land. */
  trees: number;
  /** Sunlight that reaches the ground through the air (0 to 1). */
  haze: number;
}

const BARREN: NatureSpec = { kind: 'barren', water: 0, trees: 0, haze: 1 };

export const NATURE: Partial<Record<BodyId, NatureSpec>> = {
  verdant: { kind: 'living', water: 0.3, trees: 14, haze: 0.75 },
  tide: { kind: 'ocean', water: 0.7, trees: 6, haze: 0.8 },
  murk: { kind: 'heavy', water: 0, trees: 0, haze: 0.4 },
};

export const natureOf = (body: BodyId): NatureSpec => NATURE[body] ?? BARREN;

/** Ground kept dry around the pad, so a world can always be landed on and built near. */
const PAD_CLEAR = 0.35;

/** A stretch of sea: centre angle and half-width, in the body's own frame. */
export interface Sea { angle: number; half: number }

/** The seas of a world, the same every time for a seed. Never over the pad. */
const seaCache = new Map<string, Sea[]>();
export function seasOf(body: BodyId, seed: number): Sea[] {
  const key = `${seed}/${body}`;
  const known = seaCache.get(key);
  if (known) return known;
  const seas = computeSeas(body, seed);
  seaCache.set(key, seas);
  return seas;
}
function computeSeas(body: BodyId, seed: number): Sea[] {
  const nature = natureOf(body);
  if (nature.water <= 0) return [];
  const rand = streamFor(seed, `seas/${body}`);
  const count = 2 + Math.floor(rand() * 3);
  const usable = 2 * Math.PI - 2 * PAD_CLEAR;
  const share = (nature.water * 2 * Math.PI) / count;
  const seas: Sea[] = [];
  for (let i = 0; i < count; i++) {
    const half = Math.min(share / 2, usable / (2 * count) - 0.02);
    const slot = PAD_CLEAR + (usable * (i + 0.5)) / count;
    const jitter = (rand() - 0.5) * Math.max(0, usable / count - 2 * half) * 0.8;
    seas.push({ angle: wrap(slot + jitter), half });
  }
  return seas;
}

/** Whether a surface angle is over water. */
export function onWater(body: BodyId, seed: number, angle: number): boolean {
  return seasOf(body, seed).some(s => Math.abs(wrap(angle - s.angle)) <= s.half);
}

/** Tree positions (surface angles) and heights in metres, on dry land away from the pad. */
const treeCache = new Map<string, { angle: number; height: number }[]>();
export function treesOf(body: BodyId, seed: number): { angle: number; height: number }[] {
  const key = `${seed}/${body}`;
  const known = treeCache.get(key);
  if (known) return known;
  const trees = computeTrees(body, seed);
  treeCache.set(key, trees);
  return trees;
}
function computeTrees(body: BodyId, seed: number): { angle: number; height: number }[] {
  const nature = natureOf(body);
  if (nature.trees <= 0) return [];
  const rand = streamFor(seed, `trees/${body}`);
  const count = Math.round(nature.trees * 2 * Math.PI);
  const trees: { angle: number; height: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = wrap(rand() * 2 * Math.PI);
    const height = 8 + rand() * 14;
    if (Math.abs(angle) < PAD_CLEAR * 0.6 || onWater(body, seed, angle)) continue;
    trees.push({ angle, height });
  }
  return trees;
}
