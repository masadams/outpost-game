import { describe, expect, it } from 'vitest';
import { engineVoice, soundscape } from '../src/audio/soundscape';
import { createWorld } from '../src/sim/world';
import { planetAt, surfacePosition } from '../src/sim/celestial';
import { ATMOSPHERE, WORLD } from '../src/sim/config';

describe('soundscape by area', () => {
  it('tells apart the home ground, the sky, open space and Nacre', () => {
    const w = createWorld();
    expect(soundscape(w).area).toBe('home-surface');
    const home = planetAt('home', w.system);
    w.ship.state = 'flying';
    w.ship.position = surfacePosition(home, 0, 300);
    expect(soundscape(w).area).toBe('home-sky');
    w.ship.position = surfacePosition(home, 0, ATMOSPHERE.height + 500);
    const space = soundscape(w);
    expect(space.area).toBe('space');
    expect(space.air).toBe(0);
    const moon = planetAt('moon', w.system);
    w.ship.position = surfacePosition(moon, 0, 300);
    expect(soundscape(w).area).toBe('moon-sky');
    w.ship.state = 'landed';
    w.ship.position = surfacePosition(moon, 0, WORLD.shipRadius);
    expect(soundscape(w).area).toBe('moon-surface');
  });

  it('gives each area its own music and keeps air out of vacuum', () => {
    const w = createWorld();
    const ground = soundscape(w);
    w.ship.state = 'flying';
    w.ship.position = surfacePosition(planetAt('home', w.system), 0, ATMOSPHERE.height + 500);
    const space = soundscape(w);
    expect(space.music.root).not.toBe(ground.music.root);
    expect(space.ambience.level).toBeLessThan(ground.ambience.level);
  });

  it('makes the engine roar in air and thrum quietly in vacuum', () => {
    const air = engineVoice(1);
    const vacuum = engineVoice(0);
    expect(vacuum.level).toBeLessThan(air.level);
    expect(vacuum.rumbleCutoff).toBeLessThan(air.rumbleCutoff);
  });
});
