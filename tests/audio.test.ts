import { describe, expect, it } from 'vitest';
import { AudioDirector } from '../src/audio/director';
import { parsePreferences } from '../src/audio/preferences';
import { createWorld } from '../src/sim/world';

describe('audio events stay separate from simulation', () => {
  it('emits launch, impact, touchdown and crash cues only on transitions', () => {
    const world = createWorld(), director = new AudioDirector(); director.reset(world);
    world.ship.state = 'flying'; world.ship.thrusting = true;
    expect(director.update(world, 1 / 60, false)).toMatchObject({ cues: ['launch'], engine: true });
    expect(director.update(world, 1 / 60, false).cues).toEqual([]);
    world.ship.hull = 80; expect(director.update(world, 1 / 60, false).cues).toContain('impact');
    world.ship.state = 'landed'; expect(director.update(world, 1 / 60, false).cues).toContain('land');
    world.ship.state = 'crashed'; world.ship.hull = 0;
    expect(director.update(world, 1 / 60, false).cues).toEqual(['crash']);
  });
  it('silences pause, does not replay events on resume, and rebases after load/reset', () => {
    const world = createWorld(), director = new AudioDirector(); director.reset(world);
    world.ship.state = 'flying'; world.ship.thrusting = true;
    expect(director.update(world, 1, true)).toEqual({ cues: [], engine: false, mining: false, tractor: false, machinery: false });
    expect(director.update(world, 1 / 60, false).cues).toEqual([]);
    const fresh = createWorld(); director.reset(fresh); expect(director.update(fresh, 1 / 60, false).cues).toEqual([]);
  });
  it('plays local fracture, pickup and delivery cues without reacting to distant rocks', () => {
    const world = createWorld(), director = new AudioDirector(); director.reset(world);
    world.asteroids.splice(0, 1); world.ship.cargo.iron = 5;
    expect(director.update(world, 1 / 60, false).cues).toEqual(['pickup', 'fracture']);
    world.unloaded = 5; world.ship.cargo.iron = 0;
    expect(director.update(world, 1 / 60, false).cues).toEqual(['delivery']);
    world.ship.position = { x: 0, y: -10000 }; director.reset(world); world.asteroids.splice(0, 1);
    expect(director.update(world, 1 / 60, false).cues).not.toContain('fracture');
  });
  it('paces footsteps by distance, detects jumps and rate-limits low oxygen warnings', () => {
    const world = createWorld(), director = new AudioDirector(); world.playerMode = 'astronaut'; director.reset(world);
    world.astronaut.position.x += 2; expect(director.update(world, 1, false).cues).toEqual([]);
    world.astronaut.position.x += 2; expect(director.update(world, 1, false).cues).toContain('step');
    world.astronaut.grounded = false; expect(director.update(world, 1, false).cues).toContain('jump');
    world.astronaut.oxygen = 29; expect(director.update(world, 1, false).cues).toContain('warning');
    for (let i = 0; i < 7; i++) expect(director.update(world, 1, false).cues).not.toContain('warning');
    expect(director.update(world, 1, false).cues).toContain('warning');
  });
  it('coalesces construction cues and restricts production hum to nearby working facilities', () => {
    const world = createWorld(), director = new AudioDirector(); director.reset(world);
    world.colony.buildings.push({ id: 1, kind: 'refinery', angle: 0.2, enabled: true, recipe: 0, progress: 1.9, status: 'running' });
    expect(director.update(world, 1 / 60, false)).toMatchObject({ cues: ['build'], machinery: true });
    world.colony.buildings[0].progress = 0;
    expect(director.update(world, 1 / 60, false).cues).toContain('production');
    world.ship.position.y = -10000; expect(director.update(world, 1 / 60, false).machinery).toBe(false);
    world.colony.buildings = []; expect(director.update(world, 1 / 60, false).cues).toContain('demolish');
  });
  it('observes snapshots without mutating world state', () => {
    const world = createWorld(), original = structuredClone(world), director = new AudioDirector();
    director.reset(world); director.update(world, 1, false); expect(world).toEqual(original);
  });
});
it.each([null, '{broken', '{"muted":false,"volume":2}', '{"muted":"yes","volume":0.2}'])('recovers malformed audio preferences: %s', text => {
  expect(parsePreferences(text)).toEqual({ muted: false, volume: 0.35 });
});
it('restores valid muted and zero-volume preferences', () => {
  expect(parsePreferences('{"muted":true,"volume":0}')).toEqual({ muted: true, volume: 0 });
});
