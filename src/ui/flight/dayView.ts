import { nearestPlanet, relative } from '../../sim/celestial';
import { localAngle } from '../../sim/math';
import { sunClock, type DayPhase } from '../../sim/sun';
import type { WorldState } from '../../sim/world';
import { duration } from './stormView';

export interface DayView {
  phase: DayPhase;
  /** "Day", "Dusk", "Night", "Dawn". */
  label: string;
  /** "Dusk in 3 min 10 s". */
  detail: string;
  daylight: number;
}

const LABEL: Record<DayPhase, string> = { day: 'Day', dusk: 'Dusk', night: 'Night', dawn: 'Dawn' };

/** The sky clock for where the player is. Null when the day and night cycle is off. */
export function dayView(w: WorldState): DayView | null {
  const root = w.rootWorld ?? w;
  if (!root.system.sun) return null;
  const position = w.playerMode === 'astronaut' ? w.astronaut.position : w.ship.position;
  const planet = nearestPlanet(position, w.system);
  const clock = sunClock(w.system, localAngle(relative(position, planet)));
  const next = clock.day ? 'Dusk' : 'Dawn';
  return {
    phase: clock.phase,
    label: LABEL[clock.phase],
    detail: `${next} in ${duration(clock.secondsToChange)}`,
    daylight: clock.daylight,
  };
}
