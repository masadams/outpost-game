import { describe, expect, it } from 'vitest';
import { engineVoice, soundscape, swellAt } from '../src/audio/soundscape';
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

describe('each world sounds like itself', () => {
  /** Stands the pilot on a world's ground, with the system's binary worlds present. */
  function onGround(body: 'home' | 'verdant' | 'tide' | 'murk' | 'ember' | 'cinder') {
    const w = createWorld(4242);
    w.system.binary = true;
    w.ship.state = 'landed';
    w.ship.position = surfacePosition(planetAt(body, w.system), 0, WORLD.shipRadius);
    return soundscape(w);
  }

  it('gives the air worlds different voices and the airless ones near silence', () => {
    const home = onGround('home');
    const tide = onGround('tide');
    const murk = onGround('murk');
    const verdant = onGround('verdant');
    const cinder = onGround('cinder');
    expect(tide.body).toBe('tide');
    expect(tide.ambience.swell.depth).toBeGreaterThan(home.ambience.swell.depth);
    expect(murk.ambience.hum.level).toBeGreaterThan(0);
    expect(home.ambience.hum.level).toBe(0);
    expect(verdant.ambience.frequency).toBeGreaterThan(home.ambience.frequency);
    expect(cinder.ambience.level).toBeLessThan(home.ambience.level / 3);
    expect(cinder.ambience.swell.depth).toBe(0);
  });

  it('swells between the trough and the crest, and stays steady with no swell', () => {
    const swell = { rate: 0.13, depth: 0.85 };
    const levels = Array.from({ length: 400 }, (_, i) => swellAt(swell, i * 0.1));
    expect(Math.min(...levels)).toBeGreaterThanOrEqual(1 - 0.85 - 1e-9);
    expect(Math.max(...levels)).toBeLessThanOrEqual(1);
    expect(Math.max(...levels) - Math.min(...levels)).toBeGreaterThan(0.5);
    expect(swellAt({ rate: 0, depth: 0 }, 12)).toBe(1);
  });
});
