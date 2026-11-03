import { expect, it } from 'vitest';
import { flightRegion } from '../src/sim/flightRegion';
import { ATMOSPHERE, WORLD } from '../src/sim/config';
import { airDensity, gravity } from '../src/sim/environment';
import { AudioDirector } from '../src/audio/director';
import { createWorld } from '../src/sim/world';

const at = (height: number) => ({ x: 0, y: -WORLD.radius - height });
it('labels atmosphere, the final 200 m of thin air, and vacuum at the actual drag boundary', () => {
  expect(flightRegion(at(100))).toBe('atmosphere'); expect(flightRegion(at(ATMOSPHERE.height - 200))).toBe('thin-air');
  expect(flightRegion(at(ATMOSPHERE.height - 0.01))).toBe('thin-air'); expect(airDensity(at(ATMOSPHERE.height - 0.01))).toBeGreaterThan(0);
  expect(flightRegion(at(ATMOSPHERE.height))).toBe('space'); expect(airDensity(at(ATMOSPHERE.height))).toBe(0);
  expect(Math.hypot(gravity(at(ATMOSPHERE.height)).x, gravity(at(ATMOSPHERE.height)).y)).toBeGreaterThan(0);
});
it('uses planet-centre distance in every direction', () => {
  expect(flightRegion({ x: WORLD.radius + ATMOSPHERE.height, y: 0 })).toBe('space'); expect(flightRegion({ x: 0, y: WORLD.radius + 10 })).toBe('atmosphere');
});
it('announces actual exit and entry once with cooldown instead of chattering at the boundary', () => {
  const w = createWorld(); w.ship.state = 'flying'; w.ship.position = at(1190); const d = new AudioDirector(); d.reset(w);
  w.ship.position = at(1210); expect(d.update(w, 0, false).cues).toContain('atmosphereExit');
  expect(d.update(w, 6, false).cues).not.toContain('atmosphereExit');
  w.ship.position = at(1190); expect(d.update(w, 0, false).cues).toContain('atmosphereEntry');
  w.ship.position = at(1210); expect(d.update(w, 0.1, false).cues).not.toContain('atmosphereExit');
});
it('silences pause/load and does not announce ship region changes to an astronaut', () => {
  const w = createWorld(); w.ship.state = 'flying'; w.ship.position = at(1190); const d = new AudioDirector(); d.reset(w);
  w.ship.position = at(1210); expect(d.update(w, 1, true).cues).toEqual([]); expect(d.update(w, 1, false).cues).toEqual([]);
  d.reset(w); expect(d.update(w, 0, false).cues).toEqual([]);
  w.playerMode = 'astronaut'; w.ship.position = at(1190); expect(d.update(w, 10, false).cues).not.toContain('atmosphereEntry');
});
