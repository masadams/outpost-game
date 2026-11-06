import { seeded } from './random';

/** Mixes a parent seed with a name, so every part of the world (a belt, a body's ground) has its own repeatable stream. */
export function childSeed(parent: number, key: string): number {
  let h = 2166136261 ^ (parent | 0);
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A repeatable random stream for one named part of the world. */
export function streamFor(seed: number, key: string): () => number {
  return seeded(childSeed(seed, key));
}

/** A value between 1 − spread and 1 + spread. */
export const around = (rand: () => number, spread: number): number => 1 + (rand() * 2 - 1) * spread;
