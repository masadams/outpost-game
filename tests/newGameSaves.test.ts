import { describe, expect, it } from 'vitest';
import { newWorld } from '../src/preferences/sun';
import { stepWorld } from '../src/sim/world';
import { encodeCheckpoint, decodeCheckpoint } from '../src/persistence/checkpoint';

describe('a new game', () => {
  // New games pick any seed up to 2^32 - 1; every one must save from the start and after a while.
  for (const seed of [1, 999_999_999, 1_000_000_001, 1_586_763_694, 3_978_916_274, 4_294_967_295]) {
    it(`saves and loads with seed ${seed}`, () => {
      const w = newWorld(seed);
      expect(() => encodeCheckpoint(w)).not.toThrow();
      for (let i = 0; i < 120; i++) stepWorld(w, { thrust: false, turn: 0 }, 0.5);
      const loaded = decodeCheckpoint(encodeCheckpoint(w));
      expect(loaded.seed).toBe(seed);
    });
  }
});
