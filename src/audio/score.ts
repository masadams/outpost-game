import type { WorldState } from '../sim/world';
import { daylightAt } from '../sim/sun';
import { nearestPlanet, surfaceAngle } from '../sim/celestial';
import { soundscape } from './soundscape';

/**
 * The game's music, as data: a mood picks a key, a tempo and a chord progression; each bar is planned from the mood and
 * the bar number alone, so it is deterministic, testable and never needs recorded audio.
 */
export type Mood = 'calm' | 'space' | 'night' | 'far' | 'tension' | 'action';

export interface MoodSpec {
  /** Root of the key as a MIDI note. */
  key: number;
  /** Scale steps (semitones above the key). */
  scale: readonly number[];
  /** Chord roots as scale degrees, one per bar, looping. */
  progression: readonly number[];
  bpm: number;
  /** How busy each part is, 0 to 1. */
  arp: number;
  melody: number;
  bass: 'whole' | 'pulse' | 'drive';
  drums: boolean;
  /** Pad brightness (lowpass cutoff, Hz). */
  brightness: number;
}

export const MOODS: Record<Mood, MoodSpec> = {
  // Warm and plain: home ground, building, mining near the base.
  calm: { key: 50, scale: [0, 2, 4, 6, 7, 9, 11], progression: [0, 5, 3, 4, 0, 5, 1, 4], bpm: 74, arp: 0.6, melody: 0.5, bass: 'whole', drums: false, brightness: 1500 },
  // Wide and slow out in the dark between worlds.
  space: { key: 45, scale: [0, 2, 4, 6, 7, 9, 11], progression: [0, 1, 0, 6, 0, 1, 5, 4], bpm: 60, arp: 0.25, melody: 0.35, bass: 'whole', drums: false, brightness: 1100 },
  // The base at night: minor, softer.
  night: { key: 48, scale: [0, 2, 3, 5, 7, 8, 10], progression: [0, 5, 2, 6, 0, 5, 3, 4], bpm: 66, arp: 0.4, melody: 0.4, bass: 'whole', drums: false, brightness: 900 },
  // Other worlds: cool and modal.
  far: { key: 52, scale: [0, 2, 3, 5, 7, 9, 10], progression: [0, 3, 0, 6, 0, 3, 4, 6], bpm: 68, arp: 0.5, melody: 0.45, bass: 'whole', drums: false, brightness: 1300 },
  // A storm is on its way: low pulse, no tune.
  tension: { key: 45, scale: [0, 1, 3, 5, 7, 8, 10], progression: [0, 0, 5, 1, 0, 0, 5, 6], bpm: 92, arp: 0.3, melody: 0, bass: 'pulse', drums: false, brightness: 700 },
  // Rocks are falling.
  action: { key: 45, scale: [0, 2, 3, 5, 7, 8, 10], progression: [0, 5, 6, 0, 0, 5, 3, 4], bpm: 118, arp: 0.9, melody: 0.2, bass: 'drive', drums: true, brightness: 1800 },
};

/** Which mood fits what is happening around the player. */
export function moodFor(w: WorldState): Mood {
  const root = w.rootWorld ?? w;
  if (root.defence.meteors.length > 0) return 'action';
  if (root.storm.phase === 'approaching') return 'tension';
  const area = soundscape(w).area;
  if (area === 'space') return 'space';
  const viewer = w.playerMode === 'astronaut' ? w.astronaut.position : w.ship.position;
  const body = nearestPlanet(viewer, w.system);
  if (body.id !== 'home') return 'far';
  if (root.system.sun && daylightAt(root.system, surfaceAngle(body, viewer), body.id) < 0.2) return 'night';
  return 'calm';
}

export interface Note {
  /** Seconds from the start of the bar. */
  at: number;
  /** MIDI note number. */
  pitch: number;
  /** Seconds. */
  length: number;
  /** 0 to 1. */
  velocity: number;
  part: 'pad' | 'bass' | 'arp' | 'melody' | 'kick' | 'hat';
}

export const beatSeconds = (mood: Mood): number => 60 / MOODS[mood].bpm;
export const barSeconds = (mood: Mood): number => 4 * beatSeconds(mood);
export const frequency = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

/** A small, repeatable hash in [0, 1). */
function hash(a: number, b: number, c = 0): number {
  let h = Math.imul(a + 1, 2654435761) ^ Math.imul(b + 7, 40503) ^ Math.imul(c + 13, 2246822519);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** The scale note `degree` steps up from the key (wrapping into higher octaves). */
function degree(spec: MoodSpec, d: number): number {
  const n = spec.scale.length;
  const octave = Math.floor(d / n);
  return spec.key + spec.scale[((d % n) + n) % n] + 12 * octave;
}

/** Everything that plays in one bar of a mood. */
export function barNotes(mood: Mood, bar: number): Note[] {
  const spec = MOODS[mood];
  const beat = beatSeconds(mood);
  const length = 4 * beat;
  const root = spec.progression[((bar % spec.progression.length) + spec.progression.length) % spec.progression.length];
  const chord = [root, root + 2, root + 4].map(d => degree(spec, d));
  const notes: Note[] = [];
  // Pad: the chord, held across the bar, an octave up.
  for (const p of chord) notes.push({ at: 0, pitch: p + 12, length: length * 1.15, velocity: 0.6, part: 'pad' });
  // Bass.
  const bass = degree(spec, root) - 12;
  if (spec.bass === 'whole') notes.push({ at: 0, pitch: bass, length: length * 0.95, velocity: 0.7, part: 'bass' });
  else {
    const steps = spec.bass === 'pulse' ? 8 : 16;
    for (let i = 0; i < steps; i++) {
      const at = (i * length) / steps;
      notes.push({ at, pitch: bass, length: (length / steps) * 0.7, velocity: i % (steps / 4) === 0 ? 0.8 : 0.5, part: 'bass' });
    }
  }
  // Arpeggio: chord tones climbing and falling in eighths, thinned by how busy the mood is.
  const pattern = [0, 1, 2, 3, 2, 1, 2, 0];
  for (let i = 0; i < 8; i++) {
    if (hash(bar, i, 1) > spec.arp) continue;
    const tone = pattern[i] === 3 ? chord[0] + 12 : chord[pattern[i]];
    notes.push({ at: (i * beat) / 2, pitch: tone + 12, length: beat * 0.9, velocity: 0.35 + 0.2 * hash(bar, i, 2), part: 'arp' });
  }
  // Melody: a few notes wandering over the scale, resting often.
  let step = root + 7;
  for (let i = 0; i < 4; i++) {
    const roll = hash(bar, i, 3);
    if (roll > spec.melody) continue;
    step += roll < spec.melody * 0.5 ? 1 : -1;
    if (hash(bar, i, 4) < 0.25) step += 2;
    notes.push({ at: i * beat + (hash(bar, i, 5) < 0.3 ? beat / 2 : 0), pitch: degree(spec, step) + 12, length: beat * 1.6, velocity: 0.5, part: 'melody' });
  }
  if (spec.drums) {
    for (let i = 0; i < 4; i++) notes.push({ at: i * beat, pitch: 36, length: 0.25, velocity: i % 2 === 0 ? 0.9 : 0.6, part: 'kick' });
    for (let i = 0; i < 8; i++) notes.push({ at: (i * beat) / 2 + beat / 4, pitch: 90, length: 0.05, velocity: 0.3, part: 'hat' });
  }
  return notes;
}
