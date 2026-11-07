import { fuelCapacity } from './shipStats';
import { tripFuel } from './tripFuel';
import type { Destination } from './explorationConfig';
import type { WorldState } from './world';

export interface Preflight {
  /** Good to go, short of fuel on board, or out of reach for this ship's tank. */
  verdict: 'ready' | 'refuel' | 'too far';
  /** One short line for the player. */
  line: string;
}

/** Compares the fuel a trip needs with what is on board and what the tank can ever hold. */
export function preflight(w: WorldState, key: Destination): Preflight {
  const need = Math.ceil(tripFuel(w, key).kg / 5) * 5;
  const have = Math.floor(w.ship.fuel);
  const tank = fuelCapacity(w.ship);
  if (need > tank) {
    return { verdict: 'too far', line: `Needs about ${need} kg and your tank holds ${tank}. Fit a bigger tank or a more efficient drive.` };
  }
  if (need > have) {
    return { verdict: 'refuel', line: `Needs about ${need} kg and you have ${have}. Refuel first.` };
  }
  return { verdict: 'ready', line: `Enough fuel: about ${need} kg of your ${have}.` };
}
