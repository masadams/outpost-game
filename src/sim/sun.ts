import type { BodyId, SystemFrame } from './celestial';
import { lightAt, SUN, sunAngle } from './star';
import { heading, type Vec } from './math';

export { SUN, sunAngle } from './star';

const TURN = Math.PI * 2;

/** How high the sun is for a place at this surface angle, ignoring the star's finite distance and eclipses: 1 overhead, 0 on the horizon. */
export function sunElevation(angle: number, time: number): number {
  return Math.cos(angle - sunAngle(time));
}

const smooth = (x: number): number => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

/** Share of full sunlight (0 to 1) at a surface angle, from the real position of the star and anything in front of it. Always 1 when the sun is off. */
export function daylightAt(system: SystemFrame, angle: number, body: BodyId = 'home'): number {
  if (!system.sun) return 1;
  const light = lightAt(system, body, angle);
  const twilight = smooth((light.elevation - SUN.zeroElevation) / (SUN.fullElevation - SUN.zeroElevation));
  return twilight * (1 - light.eclipse);
}

/** What a solar panel gets: daylight, scaled by how bright the star is at that distance (never more than double). */
export function solarFactor(system: SystemFrame, angle: number, body: BodyId = 'home'): number {
  if (!system.sun) return 1;
  return daylightAt(system, angle, body) * Math.min(2, lightAt(system, body, angle).flux);
}

/** Direction from the planet's centre toward the sun, as a unit vector in the world frame (up is −y, as for surface angles). */
export function sunDirection(time: number): Vec {
  return heading(sunAngle(time));
}

export type DayPhase = 'day' | 'dusk' | 'night' | 'dawn' | 'eclipse';

export interface SunClock {
  daylight: number;
  phase: DayPhase;
  /** Whether it is day (more than half lit). */
  day: boolean;
  /** Seconds until the light crosses half strength again, in either direction. */
  secondsToChange: number;
}

/** What the sky is doing at a place: used for the clock chip and for forecasts. */
export function sunClock(system: SystemFrame, angle: number): SunClock {
  const rate = TURN / SUN.dayLength;
  const daylight = daylightAt(system, angle);
  // The elevation at which the light is half strength.
  const half = SUN.zeroElevation + 0.5 * (SUN.fullElevation - SUN.zeroElevation);
  const edge = Math.acos(half);
  const offset = ((sunAngle(system.time) - angle) % TURN + TURN) % TURN;
  const rising = Math.sin(angle - sunAngle(system.time)) > 0;
  const day = offset < edge || offset > TURN - edge;
  let ahead: number;
  if (offset < edge) ahead = edge - offset;
  else if (offset <= TURN - edge) ahead = TURN - edge - offset;
  else ahead = TURN + edge - offset;
  const phase: DayPhase = daylight >= 0.95 ? 'day' : daylight <= 0.05 ? 'night' : rising ? 'dawn' : 'dusk';
  return { daylight, phase, day, secondsToChange: ahead / rate };
}
