import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { groundVelocity, planetAt, surfacePosition } from '../src/sim/celestial';
import { WORLD } from '../src/sim/config';
import { onWater } from '../src/sim/nature';
import { KEYSTONE_WORLDS, KEYSTONES, keystoneAngle, keystoneCount, keystonesOpen, keystoneState, validKeystones } from '../src/sim/keystones';
import { hasMemory, stepStory } from '../src/sim/story';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';
import { mapView } from '../src/ui/map/mapView';
import { carrierView } from '../src/ui/base/baseView';

const idle = { thrust: false, turn: 0 };

function game(seed = 4242) {
  const w = createWorld(seed);
  w.system.sun = true;
  w.asteroids = [];
  stepStory(w);
  return w;
}

/** A game where the unit already knows there was one ship. */
function open(seed = 4242) {
  const w = game(seed);
  w.exploration.story!.memories.push('oneShip');
  return w;
}

/** Stands the pilot on a world at a surface angle, on foot. */
function standAt(w: ReturnType<typeof game>, id: (typeof KEYSTONE_WORLDS)[number], angle: number) {
  const p = planetAt(id, w.system);
  w.playerMode = 'astronaut';
  w.astronaut.position = surfacePosition(p, angle, 1);
  w.astronaut.velocity = groundVelocity(p, w.astronaut.position);
  w.astronaut.grounded = true;
  // Park the lander beside the pilot so nothing about it changes the test.
  w.ship.position = surfacePosition(p, angle, WORLD.shipRadius);
  w.ship.velocity = groundVelocity(p, w.ship.position);
  w.ship.state = 'landed';
}

describe('keystones', () => {
  it('are hidden and cannot be picked up until the unit knows there was one ship', () => {
    const w = game();
    expect(keystonesOpen(w)).toBe(false);
    standAt(w, 'cinder', keystoneAngle('cinder', w.seed));
    stepWorld(w, idle, 1 / 60);
    expect(keystoneState(w, 'cinder')).toBe('lying');
    expect(carrierView(w)).toBeNull();
  });

  it('lie on dry land off the pad on every world, in every seed tried', () => {
    for (const seed of [1, 7, 42, 4242, 999_999_999]) {
      for (const id of KEYSTONE_WORLDS) {
        const angle = keystoneAngle(id, seed);
        expect(onWater(id, seed, angle), `${id} seed ${seed}`).toBe(false);
        const metres = Math.abs(angle - WORLD.padAngle) * planetAt(id, { time: 0, binary: true, seed }).radius;
        expect(metres, `${id} seed ${seed}`).toBeGreaterThan(WORLD.padHalfWidth + 20);
        expect(metres, `${id} seed ${seed}`).toBeLessThan(900);
      }
    }
  });

  it('are picked up by walking over them, on each world', () => {
    for (const id of KEYSTONE_WORLDS) {
      const w = open();
      standAt(w, id, keystoneAngle(id, w.seed));
      stepWorld(w, idle, 1 / 60);
      expect(keystoneState(w, id), id).toBe('carried');
      expect(w.notice.message).toContain(KEYSTONES[id].label.toUpperCase());
    }
  });

  it('are not picked up from far away', () => {
    const w = open();
    standAt(w, 'cinder', keystoneAngle('cinder', w.seed) + 0.5);
    stepWorld(w, idle, 1 / 60);
    expect(keystoneState(w, 'cinder')).toBe('lying');
  });

  it('come home when the lander sets down at home, and the count goes up', () => {
    const w = open();
    w.exploration.keystones = { cinder: 'carried', moon: 'carried' };
    stepWorld(w, idle, 1 / 60);
    expect(keystoneState(w, 'cinder')).toBe('home');
    expect(keystoneState(w, 'moon')).toBe('home');
    expect(keystoneCount(w)).toEqual({ home: 2, total: 7 });
    expect(w.notice.message).toContain('2 OF 7');
    expect(hasMemory(w, 'longPatience')).toBe(true);
    expect(carrierView(w)!.parts.filter(p => p.state === 'home')).toHaveLength(2);
  });

  it('bring back the last memory when all seven are home', () => {
    const w = open();
    w.exploration.keystones = Object.fromEntries(KEYSTONE_WORLDS.map(id => [id, 'home']));
    stepStory(w);
    expect(hasMemory(w, 'allParts')).toBe(true);
  });

  it('survive a save, and bad keystone data is rejected', () => {
    const w = open();
    w.exploration.keystones = { cinder: 'carried', murk: 'home' };
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(loaded.exploration.keystones).toEqual({ cinder: 'carried', murk: 'home' });
    expect(validKeystones({ home: 'home' })).toBe(false);
    expect(validKeystones({ cinder: 'lost' })).toBe(false);
  });

  it('show on the Map where each one is', () => {
    const w = open();
    w.exploration.known.push('moon', 'cinder', 'ember', 'glint', 'verdant', 'tide', 'murk');
    w.exploration.selected = 'cinder';
    const text = mapView(w).selected.body;
    expect(text).toContain('Carrier part: Unit 2\'s archive');
    expect(text).toMatch(/\d+ m west of the pad/);
  });
});
