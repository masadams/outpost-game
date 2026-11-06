import { describe, expect, it } from 'vitest';
import { flightSafety } from '../src/sim/flightSafety';
import { createShip, safeLanding } from '../src/sim/physics';
import { WORLD } from '../src/sim/config';
import { heading } from '../src/sim/math';
import { AudioDirector } from '../src/audio/director';
import { createWorld } from '../src/sim/world';

function approach(altitude = 80, radial = -3, drift = 1, tilt = 0, spin = 0, angle = 0) {
  const ship = createShip(), n = heading(angle); ship.state = 'flying'; ship.angle = angle + tilt; ship.angularVelocity = spin;
  ship.position = { x: n.x * (WORLD.radius + WORLD.shipRadius + altitude), y: n.y * (WORLD.radius + WORLD.shipRadius + altitude) };
  ship.velocity = { x: n.x * radial - n.y * drift, y: n.y * radial + n.x * drift }; return ship;
}
describe('landing instrument safety shares physical touchdown limits', () => {
  it('shows green values within limits and yellow approaching a limit', () => {
    const safe = flightSafety(approach()); expect(safe.approach).toBe(true); expect(safe.urgent).toBe(false);
    for (const k of ['radial', 'drift', 'tilt', 'spin', 'speed'] as const) expect(safe.instruments[k].level).toBe('safe');
    const close = flightSafety(approach(80, -5, 3, WORLD.safeTilt * 0.9, WORLD.safeAngularSpeed * 0.9));
    for (const k of ['radial', 'drift', 'tilt', 'spin', 'speed'] as const) expect(close.instruments[k].level).toBe('caution');
  });
  it.each([
    ['radial', -6.1, 0, 0, 0], ['drift', -1, 4.1, 0, 0], ['tilt', -1, 0, WORLD.safeTilt + 0.01, 0], ['spin', -1, 0, 0, WORLD.safeAngularSpeed + 0.01],
  ] as const)('marks %s red when its actual touchdown constraint fails', (key, radial, drift, tilt, spin) => {
    const ship = approach(80, radial, drift, tilt, spin), s = flightSafety(ship);
    expect(s.instruments[key].level).toBe('critical'); expect(s.urgent).toBe(true);
    expect(safeLanding({ onPad: true, radial, tangential: drift, tilt, spin })).toBe(false);
  });
  it('allows equality at touchdown limits instead of inventing stricter physical limits', () => {
    const s = flightSafety(approach(30, -WORLD.safeRadialSpeed, WORLD.safeTangentialSpeed, WORLD.safeTilt, WORLD.safeAngularSpeed));
    for (const k of ['radial', 'drift', 'tilt', 'spin'] as const) expect(s.instruments[k].level).not.toBe('critical');
  });
  it('accounts for local up, drift direction and pad alignment around the circular surface', () => {
    const ship = approach(20, -2, -5, 0.1, -0.4, 1.2), s = flightSafety(ship);
    expect(s.instruments.tilt.level).toBe('safe'); expect(s.instruments.drift.level).toBe('critical'); expect(s.instruments.spin.level).toBe('critical');
    expect(s.onPad).toBe(false); expect(s.message).toContain('ROUGH GROUND'); expect(s.instruments.altitude.level).toBe('critical');
  });
  it('lets you land off the pad, but holds rough ground to gentler limits', () => {
    const gentle = flightSafety(approach(20, -1, 0, 0, 0, 0.2));
    expect(gentle.urgent).toBe(false); expect(gentle.message).toContain('ROUGH GROUND');
    const padSpeed = flightSafety(approach(20, -5, 0, 0, 0, 0.2));
    expect(padSpeed.instruments.radial.level).toBe('critical');
  });
  it('only enables landing cues near a descending/hovering approach, with early fast-descent warning', () => {
    expect(flightSafety(approach(100, 10)).approach).toBe(false); expect(flightSafety(approach(1500, -10)).approach).toBe(false);
    expect(flightSafety(approach(700, -150)).urgent).toBe(true); expect(flightSafety(approach(250, -10)).urgent).toBe(false);
    const ship = approach(); ship.state = 'landed'; expect(flightSafety(ship).approach).toBe(false);
    ship.state = 'crashed'; expect(flightSafety(ship).approach).toBe(false);
  });
  it('warns at 15% fuel, becomes critical at 5%, and labels empty fuel explicitly', () => {
    const ship = approach(1500); ship.fuel = WORLD.fuelCapacity * 0.15; expect(flightSafety(ship).instruments.fuel.level).toBe('caution');
    ship.fuel = WORLD.fuelCapacity * 0.05; expect(flightSafety(ship).instruments.fuel.level).toBe('critical');
    ship.fuel = 0; expect(flightSafety(ship).instruments.fuel.label).toBe('EMPTY');
  });
  it('observes state without changing physics, inventories or saves', () => {
    const ship = approach(), before = structuredClone(ship); flightSafety(ship); expect(ship).toEqual(before);
  });
});
describe('flight alarm priority and cadence', () => {
  it('plays fuel cautions every eight seconds and escalates immediately to critical fuel at four-second cadence', () => {
    const world = createWorld(); world.ship = approach(1500); world.ship.fuel = 30;
    const d = new AudioDirector(); d.reset(world); expect(d.update(world, 0, false).cues).toContain('fuelWarning');
    expect(d.update(world, 7, false).cues).not.toContain('fuelWarning'); expect(d.update(world, 1, false).cues).toContain('fuelWarning');
    world.ship.fuel = 10; expect(d.update(world, 0, false).cues).toContain('fuelWarning');
    expect(d.update(world, 3.9, false).cues).not.toContain('fuelWarning'); expect(d.update(world, 0.1, false).cues).toContain('fuelWarning');
  });
  it('prioritizes urgent landing over fuel and threat tones with a 2.5-second repeat', () => {
    const w = createWorld(); w.ship = approach(80, -20); w.ship.fuel = 10; const d = new AudioDirector(); d.reset(w);
    w.defence.meteors.push({ ...structuredClone(w.asteroids[0]), id: 100 });
    expect(d.update(w, 0, false).cues).toEqual(['landingWarning']); expect(d.update(w, 2.4, false).cues).toEqual([]);
    expect(d.update(w, 0.1, false).cues).toEqual(['landingWarning']);
    w.ship = approach(1500); w.ship.fuel = 10; expect(d.update(w, 0, false).cues).toEqual(['atmosphereExit', 'fuelWarning']);
  });
  it('keeps existing threat alarms ahead of a noncritical fuel caution', () => {
    const w = createWorld(); w.ship = approach(1500); w.ship.fuel = 30; w.defence.meteors.push({ ...structuredClone(w.asteroids[0]), id: 100 });
    const d = new AudioDirector(); d.reset(w); expect(d.update(w, 0, false).cues).toEqual(['warning']);
    w.ship.fuel = 10; expect(d.update(w, 0, false).cues).toEqual(['fuelWarning']);
  });
  it('keeps landing/fuel alarms silent on foot, landed, crashed or paused, while pause freezes cadence', () => {
    const w = createWorld(); w.ship = approach(80, -20); const d = new AudioDirector(); d.reset(w);
    expect(d.update(w, 0, false).cues).toEqual(['landingWarning']); expect(d.update(w, 10, true).cues).toEqual([]);
    expect(d.update(w, 1, false).cues).toEqual([]); expect(d.update(w, 1.5, false).cues).toEqual(['landingWarning']);
    w.playerMode = 'astronaut'; expect(d.update(w, 0, false).cues).not.toContain('landingWarning');
    w.playerMode = 'ship'; w.ship.state = 'landed'; w.ship.fuel = 0; expect(d.update(w, 20, false).cues).not.toContain('fuelWarning');
    w.ship.state = 'crashed'; expect(d.update(w, 20, false).cues).not.toContain('fuelWarning');
  });
  it('does not retrigger a landing tone rapidly when piloting crosses the approach boundary', () => {
    const w = createWorld(); w.ship = approach(80, -20); const d = new AudioDirector(); d.reset(w);
    expect(d.update(w, 0, false).cues).toEqual(['landingWarning']);
    w.ship.velocity.y = -2; expect(d.update(w, 0.2, false).cues).toEqual([]);
    w.ship.velocity.y = 20; expect(d.update(w, 0.2, false).cues).toEqual([]);
    expect(d.update(w, 2.1, false).cues).toEqual(['landingWarning']);
  });
  it('keeps separate repeat limits when low fuel and landing urgency alternate', () => {
    const w = createWorld(); w.ship = approach(80, -20); w.ship.fuel = 10; const d = new AudioDirector(); d.reset(w);
    expect(d.update(w, 0, false).cues).toEqual(['landingWarning']);
    w.ship.velocity.y = -2; expect(d.update(w, 0.2, false).cues).toEqual(['fuelWarning']);
    w.ship.velocity.y = 20; expect(d.update(w, 0.2, false).cues).toEqual([]);
    w.ship.velocity.y = -2; expect(d.update(w, 0.2, false).cues).toEqual([]);
    w.ship.velocity.y = 20; expect(d.update(w, 1.9, false).cues).toEqual(['landingWarning']);
  });
});
