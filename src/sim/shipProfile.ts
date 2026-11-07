import { WORLD } from './config';
import { cannonStats, cargoCapacity, damageFactor, engineStats, equipmentMass, fuelCapacity, miningStats } from './shipStats';
import { createShip, type Ship } from './physics';

/** What a fitted ship can actually do, from its parts alone (full tank, and with the hold empty or full). */
export interface ShipProfile {
  /** Acceleration (m/s²) with a full tank and an empty hold. */
  lift: number;
  /** The same with the hold full. */
  loadedLift: number;
  /** Total speed change a full tank can give (m/s). */
  deltaV: number;
  /** kg of cargo the hold takes. */
  hold: number;
  /** Mining rate relative to the standard head. */
  mining: number;
  /** Cannon damage per shot. */
  cannon: number;
  /** Share of hit damage that still gets through. */
  exposure: number;
}

type Fit = Pick<Ship, 'equipment'>;

export function shipProfile(ship: Fit): ShipProfile {
  const engine = engineStats(ship);
  const dry = WORLD.dryMass + equipmentMass(ship);
  const fuel = fuelCapacity(ship);
  const hold = cargoCapacity(ship);
  const exhaust = engine.thrust / engine.burn;
  return {
    lift: engine.thrust / (dry + fuel),
    loadedLift: engine.thrust / (dry + fuel + hold),
    deltaV: exhaust * Math.log((dry + fuel) / dry),
    hold,
    mining: miningStats(ship).rate,
    cannon: cannonStats(ship).damage,
    exposure: damageFactor(ship),
  };
}

export type ShipRole = 'Standard lander' | 'Scout' | 'Miner' | 'Interceptor' | 'Hybrid';

const STANDARD = shipProfile(createShip());

/** How much better than the standard lander the ship is at each job (1 is the same). */
export function roleScores(p: ShipProfile): { scout: number; miner: number; interceptor: number } {
  return {
    scout: p.deltaV / STANDARD.deltaV,
    miner: Math.sqrt((p.hold / STANDARD.hold) * (p.mining / STANDARD.mining)) * Math.sqrt(p.loadedLift / STANDARD.loadedLift),
    interceptor: Math.cbrt((p.loadedLift / STANDARD.loadedLift) * (p.cannon / STANDARD.cannon) * (STANDARD.exposure / p.exposure)),
  };
}

/** The job this fit is best at, in plain words, and why. A fit that is not clearly better at anything is just a lander. */
export function shipRole(ship: Fit): { role: ShipRole; line: string } {
  const p = shipProfile(ship);
  const s = roleScores(p);
  const ranked = (Object.entries(s) as Array<['scout' | 'miner' | 'interceptor', number]>).sort((a, b) => b[1] - a[1]);
  const [best, second] = ranked;
  if (best[1] < 1.12) return { role: 'Standard lander', line: 'Not built for any one job yet.' };
  if (second[1] > best[1] * 0.92 && second[1] >= 1.12) {
    return { role: 'Hybrid', line: 'Good at more than one job, so none of them as well as a specialist.' };
  }
  const name = best[0];
  if (name === 'scout') return { role: 'Scout', line: `Goes far: ${Math.round(p.deltaV)} m/s from a full tank.` };
  if (name === 'miner') return { role: 'Miner', line: `Hauls and digs: ${p.hold} kg hold, ${p.mining.toFixed(1)}× mining.` };
  return { role: 'Interceptor', line: `Quick and hard-hitting: ${p.loadedLift.toFixed(1)} m/s² loaded, ${p.cannon} damage a shot.` };
}
