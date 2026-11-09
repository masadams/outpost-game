import { describe, expect, it } from 'vitest';
import { barNotes, barSeconds, MOODS, moodFor, type Mood } from '../src/audio/score';
import { createWorld } from '../src/sim/world';
import { planetAt, surfacePosition } from '../src/sim/celestial';
import { WORLD } from '../src/sim/config';

const MOOD_IDS = Object.keys(MOODS) as Mood[];

describe('the music score', () => {
  it('plans the same bar the same way every time', () => {
    for (const mood of MOOD_IDS) for (let bar = 0; bar < 16; bar++) expect(barNotes(mood, bar)).toEqual(barNotes(mood, bar));
  });
  it('keeps every note inside its bar (pads may ring on) and inside a sensible range', () => {
    for (const mood of MOOD_IDS) {
      for (let bar = 0; bar < 32; bar++) {
        for (const n of barNotes(mood, bar)) {
          expect(n.at).toBeGreaterThanOrEqual(0);
          expect(n.at).toBeLessThan(barSeconds(mood));
          expect(n.pitch).toBeGreaterThanOrEqual(24);
          expect(n.pitch).toBeLessThanOrEqual(96);
          expect(n.velocity).toBeGreaterThan(0);
          expect(n.velocity).toBeLessThanOrEqual(1);
        }
      }
    }
  });
  it('plays tuned notes from the key, apart from the drums', () => {
    for (const mood of MOOD_IDS) {
      const spec = MOODS[mood];
      const allowed = new Set(spec.scale.map(s => (spec.key + s) % 12));
      for (let bar = 0; bar < 16; bar++) {
        for (const n of barNotes(mood, bar)) if (n.part !== 'kick' && n.part !== 'hat') expect(allowed.has(((n.pitch % 12) + 12) % 12)).toBe(true);
      }
    }
  });
  it('is quiet and sparse when calm, busy and driving when rocks fall', () => {
    const count = (mood: Mood) => Array.from({ length: 16 }, (_, b) => barNotes(mood, b).length).reduce((a, b) => a + b, 0);
    expect(count('action')).toBeGreaterThan(count('calm'));
    expect(barNotes('action', 0).some(n => n.part === 'kick')).toBe(true);
    expect(barNotes('calm', 0).some(n => n.part === 'kick')).toBe(false);
    expect(barNotes('tension', 3).some(n => n.part === 'melody')).toBe(false);
  });
  it('picks its mood from what is happening', () => {
    const w = createWorld(5);
    expect(moodFor(w)).toBe('calm');
    w.storm.phase = 'approaching';
    expect(moodFor(w)).toBe('tension');
    w.defence.meteors.push({ id: 1, position: { x: 0, y: -3000 }, velocity: { x: 0, y: 0 }, radius: 5, mass: 50, resource: 'iron', stage: 0, health: 1, maxHealth: 1 });
    expect(moodFor(w)).toBe('action');
    const far = createWorld(5);
    far.ship.position = surfacePosition(planetAt('home', far.system), 0, WORLD.radius * 6);
    far.ship.state = 'flying';
    expect(moodFor(far)).toBe('space');
  });
});
