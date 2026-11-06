import { bodyKnown } from './explorationConfig';
import { CELESTIAL, orbitRate, type BodyId } from './celestial';
import { RESOURCE_INFO } from './resources';
import type { WorldState } from './world';

export interface BodySurvey {
  gravity: string;
  day: string;
  deposits: string;
  night: string;
}

/** Round to a coarse step so the survey reads as an estimate, not a readout. */
const roughly = (n: number, step: number): number => Math.max(step, Math.round(n / step) * step);

/** What the Observatory has worked out about a body, or null until it has watched long enough. */
export function bodySurvey(w: WorldState, id: Exclude<BodyId, 'home'>): BodySurvey | null {
  if (!bodyKnown(w.exploration, id)) return null;
  const moon = CELESTIAL[id];
  const gravity = moon.mu / moon.radius ** 2;
  const dayMinutes = (2 * Math.PI / orbitRate(id)) / 60;
  const seams = w.outposts[id].surfaceDeposits;
  const kinds = [...new Set(seams.map(d => d.resource))].map(r => RESOURCE_INFO[r].label);
  const total = seams.reduce((sum, d) => sum + d.initial, 0);
  return {
    gravity: `about ${gravity.toFixed(1)} m/s² (Selene: ${(CELESTIAL.home.mu / CELESTIAL.home.radius ** 2).toFixed(1)})`,
    day: `about ${Math.round(dayMinutes)} min, one turn per orbit`,
    night: `dark for about ${Math.round(dayMinutes / 2)} min of each day. Solar stops; bring a battery`,
    deposits: `${seams.length} seams, roughly ${roughly(total, 50)} kg: ${kinds.join(', ')}`,
  };
}

/** Nacre's survey, kept under its old name. */
export const nacreSurvey = (w: WorldState): BodySurvey | null => bodySurvey(w, 'moon');
