import { workFactor } from './facilityStats';
import { industrialPowerBlock } from './colonyPolicy';
import type { Building } from './colony';
import { powerFraction } from './power';
import { notify } from './messages';
import { SIGHTING_SECONDS } from './stormKnowledge';
import type { WorldState } from './world';

export const OBSERVATORY = {
  /** Kilowatts while scanning. */
  power: 3,
} as const;

/** A powered Observatory scans the sky. Scan time only counts while there is something out there to see. */
export function stepObservatory(w: WorldState, b: Building, dt: number): void {
  const work = dt * powerFraction(b) * workFactor(b);
  b.requestedPower = OBSERVATORY.power * powerFraction(b) * workFactor(b);
  w.colony.demand += b.requestedPower;
  if (work <= 0) {
    b.status = 'power limited';
    return;
  }
  const cost = OBSERVATORY.power * work;
  const block = industrialPowerBlock(w.colony, cost);
  if (block) {
    b.status = block;
    return;
  }
  w.colony.energy = Math.max(0, w.colony.energy - cost);
  b.gridPower = cost / dt;
  b.status = 'running';
  if (w.storm.phase === 'approaching') {
    const before = w.storm.observed;
    w.storm.observed += work;
    if (before < SIGHTING_SECONDS && w.storm.observed >= SIGHTING_SECONDS) {
      notify(w, 'The Observatory has found something large, far out.');
    }
  }
}
