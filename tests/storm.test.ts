import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { planStorm, farPosition } from '../src/sim/storm';
import { STORM } from '../src/sim/stormConfig';
import { WORLD } from '../src/sim/config';
import { planetAt } from '../src/sim/celestial';
import { localAngle, wrap } from '../src/sim/math';


describe('first storm plan', () => {
  it('is deterministic and gives every body an id, a time and a heading toward the planet', () => {
    const a = createWorld();
    const b = createWorld();
    const started = performance.now();
    planStorm(a);
    planStorm(b);
    console.log('plan ms', (performance.now() - started) / 2);
    expect(a.storm.far).toEqual(b.storm.far);
    expect(a.storm.far).toHaveLength(STORM.aim.length);
    const first = a.storm.far[0];
    expect(first.entryTime).toBe(STORM.arrivalTime);
    const planet = planetAt('home', { ...a.system, time: first.entryTime });
    const away = Math.hypot(first.entry.x - planet.position.x, first.entry.y - planet.position.y);
    expect(away).toBeCloseTo(STORM.entryRadius, 0);
  });

  it('travels in a straight line before it arrives', () => {
    const w = createWorld();
    planStorm(w);
    const body = w.storm.far[0];
    const early = farPosition(body, STORM.arrivalTime - STORM.lead);
    expect(Math.hypot(early.x - body.entry.x, early.y - body.entry.y)).toBeCloseTo(Math.hypot(body.velocity.x, body.velocity.y) * STORM.lead, 3);
  });
});

describe('first storm in flight', { timeout: 60000 }, () => {
  function run(seconds: number, w = createWorld()) {
    w.storm.armed = true;
    w.system.time = STORM.arrivalTime - STORM.lead - 61;
    for (let i = 0; i < seconds * 60; i++) stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    return w;
  }

  it('stays quiet until the bodies appear, then hands each to the meteor physics', () => {
    const w = createWorld();
    w.storm.armed = true;
    w.system.time = STORM.arrivalTime - STORM.lead - 61;
    stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(w.storm.planned).toBe(false);
    for (let i = 0; i < 70 * 60; i++) stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(w.storm.planned).toBe(true);
    expect(w.storm.phase).toBe('approaching');
    expect(w.defence.meteors).toHaveLength(0);
    expect(w.storm.far).toHaveLength(STORM.aim.length);
  });

  it('brings bodies down on the colony, with some missing, and ends when all are gone', () => {
    const w = run(STORM.lead + 61 + 400);
    expect(w.storm.far).toHaveLength(0);
    expect(w.defence.impacts).toBeGreaterThanOrEqual(3);
    expect(w.defence.impacts).toBeLessThanOrEqual(STORM.aim.length);
    expect(w.defence.meteors).toHaveLength(0);
    expect(w.storm.phase).toBe('over');
  });

  it('aims most bodies at the colony side of the pad, away from the pad itself, and one wide', () => {
    const w = createWorld();
    planStorm(w);
    const metres = w.storm.far.map(b => (b.impactAngle === null ? null : wrap(b.impactAngle - WORLD.padAngle) * WORLD.radius));
    const near = metres.filter(m => m !== null && Math.abs(m - STORM.targetOffset) < 120);
    expect(near.length).toBeGreaterThanOrEqual(3);
    expect(metres.every(m => m === null || Math.abs(m) > 60)).toBe(true);
    expect(metres.some(m => m !== null && Math.abs(m - STORM.targetOffset) > 300)).toBe(true);
  });
});

describe('storm arming', () => {
  it('does nothing until armed', () => {
    const w = createWorld();
    w.system.time = STORM.arrivalTime - STORM.lead - 61;
    for (let i = 0; i < 80 * 60; i++) stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(w.storm.planned).toBe(false);
    expect(w.storm.phase).toBe('quiet');
  });
});

describe('first storm saves', () => {
  it('survives a save and load part-way through, and plays out the same', { timeout: 60000 }, async () => {
    const { encodeCheckpoint, decodeCheckpoint } = await import('../src/persistence/checkpoint');
    const w = createWorld();
    w.storm.armed = true;
    w.system.time = STORM.arrivalTime - STORM.lead - 61;
    for (let i = 0; i < (61 + STORM.lead + 20) * 60; i++) stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(w.defence.meteors.length).toBeGreaterThan(0);
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(loaded.storm).toEqual(w.storm);
    for (let i = 0; i < 200 * 60; i++) {
      stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
      stepWorld(loaded, { thrust: false, turn: 0 }, 1 / 60);
    }
    expect(loaded.defence.impacts).toBe(w.defence.impacts);
    expect(loaded.storm.phase).toBe(w.storm.phase);
  });
});
