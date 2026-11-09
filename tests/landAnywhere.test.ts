import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { encodeCheckpoint, decodeCheckpoint } from '../src/persistence/checkpoint';
import { BODY_IDS, bodyExists, planetAt, surfacePosition, groundVelocity } from '../src/sim/celestial';
import { WORLD } from '../src/sim/config';

describe('landing on any world', () => {
  for (const body of BODY_IDS.filter(b => b !== 'home')) {
    it(`can be saved and loaded while parked on ${body}`, () => {
      let seed = 1;
      while (!bodyExists(body, { time: 0, binary: true, seed })) seed++;
      const w = createWorld(seed);
      w.system.sun = true;
      w.asteroids = [];
      const p = planetAt(body, w.system);
      w.ship.position = surfacePosition(p, 0.05, WORLD.shipRadius + 1.5);
      w.ship.velocity = groundVelocity(p, w.ship.position);
      w.ship.angle = 0.05 + p.spin;
      w.ship.state = 'flying';
      for (let i = 0; i < 600 && w.ship.state === 'flying'; i++) stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
      expect(w.ship.state).toBe('landed');
      expect(w.ship.ground).toBe(body);
      const loaded = decodeCheckpoint(encodeCheckpoint(w));
      expect(loaded.ship.ground).toBe(body);
    });
  }
});
