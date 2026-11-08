import { describe, expect, it } from 'vitest';
import { GIANT, stormFor } from '../src/sim/stormConfig';
import { WEAPONS as DEFENCE_WEAPONS } from '../src/sim/defenceConfig';
import { blastDamage, HEAVY_ROCK } from '../src/sim/weapons';
import { createWorld } from '../src/sim/world';
import { encodeCheckpoint, decodeCheckpoint } from '../src/persistence/checkpoint';

describe('the giant', () => {
  it('turns up in some seeded storms from the fourth on, aimed close to the base', () => {
    let found = 0;
    for (let seed = 1; seed <= 60; seed++) {
      expect(stormFor(3, seed).kinds ?? []).not.toContain('giant');
      const s = stormFor(5, seed);
      const i = (s.kinds ?? []).indexOf('giant');
      if (i < 0) continue;
      found++;
      expect(s.radii[i]).toBeGreaterThanOrEqual(GIANT.radius);
      expect(Math.abs(s.aim[i] + s.targetOffset)).toBeLessThanOrEqual(140);
      expect(s.aim.length).toBeLessThanOrEqual(24);
    }
    expect(found).toBeGreaterThan(5);
    expect(found).toBeLessThan(40);
  });
  it('is broken by missiles in a handful of hits, but barely scratched by lasers', () => {
    const toughness = (GIANT.radius + 8) * GIANT.toughness;
    const missile = blastDamage('missile', DEFENCE_WEAPONS.missile.damage, GIANT.radius);
    expect(toughness / missile).toBeLessThan(12);
    expect(toughness / DEFENCE_WEAPONS.laser.damage).toBeGreaterThan(80);
    expect(blastDamage('flak', 1, HEAVY_ROCK.radius + 5)).toBe(1);
    expect(blastDamage('missile', 1, HEAVY_ROCK.radius - 1)).toBe(1);
  });
  it('saves while falling', () => {
    const w = createWorld(3);
    w.defence.meteors.push({ id: 900, position: { x: 0, y: -2500 }, velocity: { x: 0, y: 0 }, radius: 46, mass: 40000, resource: 'iron', stage: 0, health: 27, maxHealth: 27 });
    w.nextId = 1000;
    expect(() => decodeCheckpoint(encodeCheckpoint(w))).not.toThrow();
  });
});
