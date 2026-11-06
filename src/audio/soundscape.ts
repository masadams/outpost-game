import { BODIES, nearestPlanet } from '../sim/celestial';
import { airFraction } from '../sim/environment';
import { flightRegion } from '../sim/flightRegion';
import type { WorldState } from '../sim/world';

export type Area = 'home-surface' | 'home-sky' | 'space' | 'moon-surface' | 'moon-sky';

export interface Soundscape {
  area: Area;
  /** Air around the listener, 0 (vacuum) to 1 (sea level on Selene). */
  air: number;
  /** Steady background: a band of noise. */
  ambience: { frequency: number; level: number };
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
  // Wind on Selene, rising with the air; a faint suit and hull hum in vacuum; a deep drone out in space.
  const ambience = area === 'home-surface' ? { frequency: 380, level: 0.012 * air }
    : area === 'home-sky' ? { frequency: 600, level: 0.02 * air }
      : area === 'space' ? { frequency: 90, level: 0.004 }
        : { frequency: onFoot ? 2800 : 140, level: onFoot ? 0.0015 : 0.003 };
  return { area, air, ambience, music: MUSIC[area] };
}

/** Engine voice by air: a roar of rushing gas in atmosphere, a lower, quieter thrum through the hull in vacuum. */
export function engineVoice(air: number): { level: number; rumbleCutoff: number; toneCutoff: number } {
  const a = Math.max(0, Math.min(1, air));
  return { level: 0.07 * (0.4 + 0.6 * a), rumbleCutoff: 110 + 400 * a, toneCutoff: 220 + 330 * a };
}
