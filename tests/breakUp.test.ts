import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { BREAK_UP, resolveDefenceHits } from '../src/sim/defence';
import { HEAVY_ROCK } from '../src/sim/weapons';
import { WEAPONS } from '../src/sim/defenceConfig';
import { encodeCheckpoint, decodeCheckpoint } from '../src/persistence/checkpoint';
import type { Meteor } from '../src/sim/defenceConfig';

function rock(radius: number, lastHit?: Meteor['lastHit']): ReturnType<typeof createWorld> {
  const w = createWorld(3);
  w.defence.meteors = [{ id: 900, position: { x: 0, y: -3000 }, velocity: { x: 0, y: 5 }, radius, mass: 0.4 * radius ** 3, resource: 'iron', stage: 0, health: 0, maxHealth: 5, ...(lastHit ? { lastHit } : {}) }];
  w.nextId = 1000;
  return w;
}

describe('breaking rocks', () => {
  it('a missile turns a small or medium rock to dust', () => {
    const w = rock(12, 'missile');
    resolveDefenceHits(w);
    expect(w.defence.meteors).toHaveLength(0);
  });
  it('a laser still splits a medium rock into two bits', () => {
    const w = rock(12, 'laser');
    resolveDefenceHits(w);
    expect(w.defence.meteors).toHaveLength(2);
  });
  it('a giant breaks into four big pieces, which break again into laser-sized ones', () => {
    const w = rock(46, 'missile');
    resolveDefenceHits(w);
    expect(w.defence.meteors).toHaveLength(BREAK_UP.giantPieces);
    const piece = w.defence.meteors[0];
    expect(piece.radius).toBeGreaterThanOrEqual(HEAVY_ROCK.radius);
    expect(piece.radius).toBeLessThan(46);
    expect(w.defence.meteors.reduce((n, m) => n + m.mass, 0)).toBeCloseTo(0.4 * 46 ** 3, 3);
    // Two missiles break a big piece; its pieces are small enough for lasers.
    expect(piece.health).toBeLessThanOrEqual(WEAPONS.missile.damage * 3 * 2);
    piece.health = 0;
    piece.lastHit = 'missile';
    resolveDefenceHits(w);
    const small = w.defence.meteors.filter(m => m.radius < HEAVY_ROCK.radius);
    expect(small).toHaveLength(BREAK_UP.pieces);
    expect(small[0].health / WEAPONS.laser.damage).toBeLessThan(10);
  });
  it('saves with the pieces in flight', () => {
    const w = rock(46, 'missile');
    resolveDefenceHits(w);
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(loaded.defence.meteors).toHaveLength(BREAK_UP.giantPieces);
  });
});
