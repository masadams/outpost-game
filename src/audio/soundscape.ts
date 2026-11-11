import { BODIES, nearestPlanet, type BodyId } from '../sim/celestial';
import { airFraction } from '../sim/environment';
import { flightRegion } from '../sim/flightRegion';
import type { WorldState } from '../sim/world';

export type Area = 'home-surface' | 'home-sky' | 'space' | 'moon-surface' | 'moon-sky';

export interface Soundscape {
  area: Area;
  /** Air around the listener, 0 (vacuum) to 1 (sea level on Selene). */
  air: number;
  /** The world the listener is on or over. */
  body: BodyId;
  /** Background: a band of noise, its swell (gusts, surf) and an optional low hum under it. */
  ambience: Ambience;
  /** Root note (Hz), chord ratios and loudness for the music. */
  music: { root: number; ratios: [number, number, number]; level: number };
}

const MUSIC: Record<Area, Soundscape['music']> = {
  'home-surface': { root: 55, ratios: [1, 1.4983, 2], level: 1 },
  'home-sky': { root: 65.406, ratios: [1, 1.2599, 1.4983], level: 1.1 },
  space: { root: 49, ratios: [1, 1.4983, 2.2449], level: 0.8 },
  'moon-surface': { root: 73.416, ratios: [1, 1.3348, 2], level: 0.8 },
  'moon-sky': { root: 82.407, ratios: [1, 1.4983, 1.8877], level: 0.9 },
};

export interface Ambience {
  frequency: number;
  level: number;
  /** Band width: low Q is a broad rush, high Q a narrow whistle. */
  q: number;
  /** A slow rise and fall of the level: gusts of wind, waves on a shore. depth 0 is steady. */
  swell: { rate: number; depth: number };
  /** A low tone under the noise; level 0 for none. */
  hum: { frequency: number; level: number };
}

/** How the air of each world sounds on the ground. Airless worlds have none; the suit and hull hum stands in. */
const AIR_VOICE: Partial<Record<BodyId, Omit<Ambience, 'level'> & { level: number }>> = {
  // Selene: a cool wind in gusts.
  home: { frequency: 380, level: 0.012, q: 0.7, swell: { rate: 0.09, depth: 0.45 }, hum: { frequency: 0, level: 0 } },
  // Verdant: a softer, brighter breeze through growth, quick light gusts.
  verdant: { frequency: 900, level: 0.011, q: 0.9, swell: { rate: 0.21, depth: 0.5 }, hum: { frequency: 0, level: 0 } },
  // Tide: surf, a deep rush that breaks and draws back every few seconds.
  tide: { frequency: 260, level: 0.02, q: 0.5, swell: { rate: 0.13, depth: 0.85 }, hum: { frequency: 0, level: 0 } },
  // Murk: thick still air, a muffled roar with a low hum in it.
  murk: { frequency: 140, level: 0.016, q: 1.4, swell: { rate: 0.03, depth: 0.2 }, hum: { frequency: 46, level: 0.008 } },
  // Ember: thin dry air, a faint hiss of grit.
  ember: { frequency: 2400, level: 0.005, q: 1.1, swell: { rate: 0.06, depth: 0.6 }, hum: { frequency: 0, level: 0 } },
};

/** Each world shifts the music's key a little, so arriving somewhere new sounds new. Selene and Nacre keep theirs. */
const KEY: Partial<Record<BodyId, number>> = {
  verdant: 1.1225, tide: 0.8909, murk: 0.7937, ember: 1.1892, cinder: 0.9439, glint: 1.3348,
};

const STEADY = { swell: { rate: 0, depth: 0 }, hum: { frequency: 0, level: 0 } };

/** Where the listener is and what the air and ground there should sound like. Pure, so it can be tested. */
export function soundscape(w: WorldState): Soundscape {
  const onFoot = w.playerMode === 'astronaut';
  const viewer = onFoot ? w.astronaut.position : w.ship.position;
  const body = nearestPlanet(viewer, w.system).id;
  const region = flightRegion(viewer, w.system);
  const landedOrWalking = onFoot || w.ship.state !== 'flying';
  const air = Math.min(1, airFraction(viewer, w.system));
  let area: Area;
  if (region === 'space') area = 'space';
  else if (!BODIES[body].air) area = landedOrWalking ? 'moon-surface' : 'moon-sky';
  else area = landedOrWalking && air > 0.5 ? 'home-surface' : 'home-sky';
  // Each world's own air on the ground, rising with the air; rushing wind higher up; a faint suit and hull hum in
  // vacuum; a deep drone out in space.
  const voice = AIR_VOICE[body] ?? AIR_VOICE.home!;
  let ambience: Ambience;
  if (area === 'home-surface') ambience = { ...voice, level: voice.level * air };
  else if (area === 'home-sky') ambience = { ...voice, frequency: voice.frequency * 1.5, level: 0.02 * air, swell: { rate: voice.swell.rate, depth: voice.swell.depth * 0.5 } };
  else if (area === 'space') ambience = { frequency: 90, level: 0.004, q: 0.7, ...STEADY };
  else ambience = { frequency: onFoot ? 2800 : 140, level: onFoot ? 0.0015 : 0.003, q: 0.7, ...STEADY };
  const key = area === 'space' ? 1 : (KEY[body] ?? 1);
  const music = { ...MUSIC[area], root: MUSIC[area].root * key };
  return { area, air, body, ambience, music };
}

/** The swell at a moment: 1 at the crest, 1 - depth in the trough. Two slow waves so it never quite repeats. */
export function swellAt(swell: Ambience['swell'], seconds: number): number {
  if (swell.depth <= 0 || swell.rate <= 0) return 1;
  const a = Math.sin(2 * Math.PI * swell.rate * seconds);
  const b = Math.sin(2 * Math.PI * swell.rate * 0.37 * seconds + 1.3);
  const wave = Math.max(0, Math.min(1, 0.5 + 0.35 * a + 0.15 * b));
  return 1 - swell.depth * (1 - wave);
}

/** Engine voice by air: a roar of rushing gas in atmosphere, a lower, quieter thrum through the hull in vacuum. */
export function engineVoice(air: number): { level: number; rumbleCutoff: number; toneCutoff: number } {
  const a = Math.max(0, Math.min(1, air));
  return { level: 0.07 * (0.4 + 0.6 * a), rumbleCutoff: 110 + 400 * a, toneCutoff: 220 + 330 * a };
}
