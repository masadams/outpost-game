import { nearestPlanet, surfaceAngle } from '../../sim/celestial';
import { sunClock, type DayPhase } from '../../sim/sun';
import { lightAt } from '../../sim/star';
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

const LABEL: Record<Exclude<DayPhase, 'eclipse'>, string> = { day: 'Day', dusk: 'Dusk', night: 'Night', dawn: 'Dawn' };

/** The sky clock for where the player is. Null when the day and night cycle is off. */
export function dayView(w: WorldState): DayView | null {
  const root = w.rootWorld ?? w;
  if (!root.system.sun) return null;
  const position = w.playerMode === 'astronaut' ? w.astronaut.position : w.ship.position;
  const planet = nearestPlanet(position, w.system);
  const angle = surfaceAngle(planet, position);
  const clock = sunClock(w.system, angle, planet.id);
  const light = lightAt(w.system, planet.id, angle);
  if (light.eclipse > 0.15 && light.elevation > 0) {
    return { phase: 'eclipse', label: 'Eclipse', detail: 'The moon is in front of the sun', daylight: clock.daylight * (1 - light.eclipse) };
  }
  const next = clock.day ? 'Dusk' : 'Dawn';
  return {
    phase: clock.phase,
    label: LABEL[clock.phase as Exclude<DayPhase, 'eclipse'>],
    detail: `${next} in ${duration(clock.secondsToChange)}`,
    daylight: clock.daylight,
  };
}
