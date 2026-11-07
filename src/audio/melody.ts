import type { Area } from './soundscape';

/** Semitone steps above the root for each area's scale: warm and plain at home, open in space, cool on the moons. */
const SCALES: Record<Area, readonly number[]> = {
  'home-surface': [0, 2, 4, 7, 9, 12],
  'home-sky': [0, 2, 4, 7, 9, 12, 14],
  space: [0, 2, 6, 7, 11, 14],
  'moon-surface': [0, 3, 5, 7, 10, 12],
  'moon-sky': [0, 3, 5, 7, 10, 14],
};

/** Seconds between notes: calmer where there is more emptiness. */
export const BEAT: Record<Area, number> = {
  'home-surface': 2.6, 'home-sky': 2.2, space: 4.2, 'moon-surface': 3.4, 'moon-sky': 3.0,
};

/**
 * The next note of a slow, wandering line: a note index that drifts a step or two from the last, with rests. Deterministic
 * from the step number, so it never repeats too neatly and never needs recorded audio. Returns null for a rest.
 */
export function melodyStep(area: Area, step: number, previous: number): { index: number; octave: number } | null {
  const scale = SCALES[area];
  let h = Math.imul(step + 1, 2654435761) ^ Math.imul(area.length, 40503);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  const roll = ((h ^ (h >>> 13)) >>> 0) / 4294967296;
  if (roll < 0.28) return null;
  const move = roll < 0.55 ? -1 : roll < 0.85 ? 1 : roll < 0.93 ? -2 : 2;
  const index = Math.max(0, Math.min(scale.length - 1, previous + move));
  return { index, octave: index >= scale.length - 2 && roll > 0.9 ? 1 : 0 };
}

/** Frequency of a scale note above a root. */
export function noteFrequency(area: Area, root: number, index: number, octave: number): number {
  const semitone = SCALES[area][Math.max(0, Math.min(SCALES[area].length - 1, index))] + 12 * octave;
  return root * 2 ** (semitone / 12);
}
