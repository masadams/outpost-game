import { planetAt } from './celestial';
import { workFactor } from './facilityStats';
import { buildingHealth } from './buildingHealth';
import { industrialPowerBlock, policyFor } from './colonyPolicy';
import { WORLD } from './config';
import { powerFraction } from './power';
import { inventoryMass } from './resources';
import type { Asteroid } from './bodies';
import type { Building } from './colony';
import type { WorldState } from './world';

/**
 * The tug bay: the next step up from the drone bay. Where a drone mines a seam on the ground, a tug flies up to a
 * rock circling home, cuts a load from it and brings it down. It works the same rocks the lander mines, so the sky
 * empties faster, and new rocks still drift in.
 */
export const TUG = {
  power: 5,
  /** Seconds of powered work per round trip. */
  seconds: 90,
  /** Most it brings back per trip, kg. */
  load: 15,
  /** Highest a rock may circle (m above the ground) for the tug to reach it. */
  reach: 3200,
  fuel: 1.2,
  wear: 2,
  grounded: 20,
  /** A rock smaller than this (kg) is taken whole. */
  scrap: 4,
} as const;

/** Rocks circling home that a tug can reach, nearest first. Only whole rocks, not fragments or belt rocks. */
export function tugTargets(world: WorldState): Asteroid[] {
  const home = planetAt('home', world.system);
  const height = (a: Asteroid) => Math.hypot(a.position.x - home.position.x, a.position.y - home.position.y) - WORLD.radius;
  return world.asteroids
    .filter(a => a.stage === 0 && !a.belt && height(a) > 0 && height(a) <= TUG.reach)
    .sort((a, b) => height(a) - height(b) || a.id - b.id);
}

/** The rock this bay's tug is working, if it is still there. */
export const tugTarget = (world: WorldState, bay: Building): Asteroid | undefined =>
  world.asteroids.find(a => a.id === bay.target);

export function stepTugBay(world: WorldState, bay: Building, dt: number, capacity: number): void {
  const colony = world.colony;
  // Only home has rocks circling it close enough.
  if (world.siteBody) {
    bay.status = 'no deposit';
    return;
  }
  if (buildingHealth(bay) <= TUG.grounded) {
    bay.status = 'worn out';
    return;
  }
  const room = capacity - inventoryMass(world.depot);
  if (room - policyFor(colony).deliveryReserve <= 1e-9) {
    bay.status = room <= 1e-9 ? 'output full' : 'delivery reserved';
    return;
  }
  // A trip starts with a target and fuel; a target that is gone (mined, fallen) is replaced.
  if (!tugTarget(world, bay)) {
    bay.target = tugTargets(world)[0]?.id;
    bay.progress = 0;
  }
  const rock = tugTarget(world, bay);
  if (!rock) {
    bay.status = 'no deposit';
    return;
  }
  if (bay.progress < 1e-9 && colony.products.fuel + 1e-9 < TUG.fuel) {
    bay.status = 'no fuel';
    return;
  }
  const fraction = powerFraction(bay) * workFactor(bay);
  bay.requestedPower = TUG.power * fraction;
  const work = dt * fraction;
  if (!work) {
    bay.status = 'power limited';
    return;
  }
  colony.demand += bay.requestedPower;
  const block = industrialPowerBlock(colony, TUG.power * work);
  if (block) {
    bay.status = block;
    return;
  }
  if (bay.progress < 1e-9) colony.products.fuel -= TUG.fuel;
  colony.energy = Math.max(0, colony.energy - TUG.power * work);
  bay.gridPower = bay.requestedPower;
  bay.status = 'running';
  bay.progress += work;
  if (bay.progress + 1e-9 < TUG.seconds) return;
  // Home with a load.
  // What is left after one load would be too small to bother with: bring the whole rock.
  const whole = rock.mass - TUG.load < TUG.scrap;
  const take = Math.min(whole ? rock.mass : TUG.load, room);
  world.depot[rock.resource] += take;
  if (rock.mass - take < TUG.scrap) {
    world.asteroids = world.asteroids.filter(a => a.id !== rock.id);
    bay.target = undefined;
  } else {
    const before = rock.mass;
    rock.mass -= take;
    rock.radius *= Math.cbrt(rock.mass / before);
  }
  bay.progress = 0;
  bay.health = Math.max(0, buildingHealth(bay) - TUG.wear);
}
