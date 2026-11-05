import { wrap, type Vec } from './math';
import type { SystemFrame } from './celestial';

/**
 * The star and the day. The sun circles the sky once per day. The planet itself does not spin (flight, landing and terrain are
 * unchanged); from the surface this looks and plays the same. Real rotation is a later, separate step.
 * Everything here is a pure function of time, so nothing is saved.
 */
export const SUN = {
  /** Seconds in a full day on Selene. */
  dayLength: 1000,
  /** Where the sun is at time zero, as a surface angle: a new game starts in the morning, in full light. */
  startAngle: -1.1,
  /** The sun's height (−1 to 1) at which a panel gives full power, and at which it gives none. Between is twilight. */
  fullElevation: 0.2,
  zeroElevation: -0.3,
} as const;

const TURN = Math.PI * 2;

/** The angle (as for surface positions) at which the sun stands overhead at this time. */
export function sunAngle(time: number): number {
  return wrap(SUN.startAngle + TURN * time / SUN.dayLength);
}

/** How high the sun is for a place at this surface angle: 1 overhead, 0 on the horizon, −1 straight below. */
export function sunElevation(angle: number, time: number): number {
  return Math.cos(angle - sunAngle(time));
}

const smooth = (x: number): number => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

/** Share of full sunlight (0 to 1) at a surface angle. Always 1 when the system has no sun switched on. */
export function daylightAt(system: SystemFrame, angle: number): number {
  if (!system.sun) return 1;
  const e = sunElevation(angle, system.time);
  return smooth((e - SUN.zeroElevation) / (SUN.fullElevation - SUN.zeroElevation));
}

/** Direction from the planet's centre toward the sun, as a unit vector in the world frame (up is −y, as for surface angles). */
export function sunDirection(time: number): Vec {
  const a = sunAngle(time);
  return { x: Math.sin(a), y: -Math.cos(a) };
}

export type DayPhase = 'day' | 'dusk' | 'night' | 'dawn';

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
