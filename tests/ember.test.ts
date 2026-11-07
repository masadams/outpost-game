import { describe, expect, it } from 'vitest';
import { BODY_IDS, bodyExists, planets } from '../src/sim/celestial';

const day = (seed: number) => ({ time: 0, binary: true, sun: true, seed });

describe('optional world Ember', () => {
  it('is never in the standard layout', () => {
    expect(bodyExists('ember', { time: 0, binary: true })).toBe(false);
    expect(planets({ time: 0, binary: true }).some(p => p.id === 'ember')).toBe(false);
  });
  it('is in some seeds and not others, the same way every time', () => {
    const seeds = Array.from({ length: 60 }, (_, i) => i + 1);
    const has = seeds.filter(s => bodyExists('ember', day(s)));
    expect(has.length).toBeGreaterThan(10);
    expect(has.length).toBeLessThan(55);
    expect(seeds.filter(s => bodyExists('ember', day(s)))).toEqual(has);
  });
  it('shows up in the planet list only where it exists', () => {
    const withIt = Array.from({ length: 60 }, (_, i) => i + 1).find(s => bodyExists('ember', day(s)))!;
    expect(planets(day(withIt)).map(p => p.id)).toContain('ember');
  });
  it('always keeps the three standard worlds', () => {
    for (const id of BODY_IDS.filter(i => i !== 'ember')) expect(bodyExists(id, day(7))).toBe(true);
  });
});
