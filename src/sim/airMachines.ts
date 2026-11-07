import { workFactor } from './facilityStats';
import { BODIES, type BodyId } from './celestial';
import { colonyPlanet } from './localWorld';
import { powerFraction } from './power';
import { industrialPowerBlock } from './colonyPolicy';
import { productCapacity } from './colony';
import type { WorldState } from './world';
import type { Building } from './colony';

/** Air condenser: draws water and oxygen out of the air, slowly, with nothing to mine. Selene's air is the reference. */
export const CONDENSER = {
  power: 5,
  /** Seconds for one cycle in air as thick as Selene's. */
  seconds: 10,
  output: { water: 0.7, oxygen: 0.3 },
  referenceDensity: 0.08,
} as const;

/** Comms antenna: speeds up an Observatory's watching, so far worlds and incoming storms are found sooner. */
export const ANTENNA = {
  power: 2,
  /** Extra watching speed each running antenna adds (before tier upgrades), and how many count. */
  boost: 0.5,
  limit: 2,
} as const;

/** How thick the air is at the surface of the world this colony is on (0 for none). */
export function surfaceAir(world: WorldState): number {
  const id = colonyPlanet(world).id as BodyId;
  return BODIES[id].air?.surfaceDensity ?? 0;
}

/** Seconds one condenser cycle takes here, or null where there is no air. */
export function condenserSeconds(world: WorldState): number | null {
  const density = surfaceAir(world);
  return density > 0 ? CONDENSER.seconds * (CONDENSER.referenceDensity / density) : null;
}

export function stepCondenser(world: WorldState, b: Building, dt: number): void {
  const colony = world.colony;
  const seconds = condenserSeconds(world);
  if (seconds === null) {
    b.status = 'no feedstock';
    return;
  }
  const capacity = productCapacity(colony);
  const room = Object.entries(CONDENSER.output).every(([p, q]) => colony.products[p as 'water' | 'oxygen'] + q <= capacity);
  if (!room) {
    b.status = 'output full';
    return;
  }
  const fraction = powerFraction(b) * workFactor(b);
  b.requestedPower = CONDENSER.power * fraction;
  const work = dt * fraction;
  if (!work) {
    b.status = 'power limited';
    return;
  }
  colony.demand += b.requestedPower;
  const block = industrialPowerBlock(colony, CONDENSER.power * work);
  if (block) {
    b.status = block;
    return;
  }
  colony.energy = Math.max(0, colony.energy - CONDENSER.power * work);
  b.gridPower = b.requestedPower;
  b.progress += work;
  b.status = 'running';
  if (b.progress + 1e-9 < seconds) return;
  b.progress = 0;
  colony.products.water += CONDENSER.output.water;
  colony.products.oxygen += CONDENSER.output.oxygen;
}

export function stepAntenna(world: WorldState, b: Building, dt: number): void {
  const colony = world.colony;
  const fraction = powerFraction(b);
  b.requestedPower = ANTENNA.power * fraction;
  const work = dt * fraction;
  if (!work) {
    b.status = 'power limited';
    return;
  }
  colony.demand += b.requestedPower;
  const block = industrialPowerBlock(colony, ANTENNA.power * work);
  if (block) {
    b.status = block;
    return;
  }
  colony.energy = Math.max(0, colony.energy - ANTENNA.power * work);
  b.gridPower = b.requestedPower;
  b.status = 'running';
}

/** Workshop: lets the ship be fitted and refitted on a world that is not home, while it is powered. */
export const WORKSHOP = { power: 3 } as const;

export function stepWorkshop(world: WorldState, b: Building, dt: number): void {
  const colony = world.colony;
  const fraction = powerFraction(b);
  b.requestedPower = WORKSHOP.power * fraction;
  const work = dt * fraction;
  if (!work) {
    b.status = 'power limited';
    return;
  }
  colony.demand += b.requestedPower;
  const block = industrialPowerBlock(colony, WORKSHOP.power * work);
  if (block) {
    b.status = block;
    return;
  }
  colony.energy = Math.max(0, colony.energy - WORKSHOP.power * work);
  b.gridPower = b.requestedPower;
  b.status = 'running';
}

/** Whether this colony has a powered workshop. */
export const workshopReady = (world: WorldState): boolean => world.colony.buildings.some(b => b.kind === 'workshop' && b.status === 'running');

/** How much faster the Observatories on this colony watch, from its running antennas. */
export function watchBoost(world: WorldState): number {
  const running = world.colony.buildings
    .filter(b => b.kind === 'antenna' && b.status === 'running')
    .sort((a, b) => workFactor(b) - workFactor(a))
    .slice(0, ANTENNA.limit);
  return 1 + running.reduce((sum, b) => sum + ANTENNA.boost * workFactor(b), 0);
}
