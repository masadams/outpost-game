import { buildingHealth, operational } from './buildingHealth';
import { availableProduct, industrialPowerBlock } from './colonyPolicy';
import { workFactor } from './facilityStats';
import { colonyPlanet } from './localWorld';
import { wrap } from './math';
import { powerFraction } from './power';
import type { Building } from './colony';
import type { WorldState } from './world';

/**
 * The worker bay: a small drone that flies out to build what is queued and to patch up damaged buildings, so the
 * pilot does not have to walk to every job. It builds slower than the pilot and pays for repairs in alloy, as the
 * pilot does.
 */
export const WORKER = {
  power: 2,
  /** Metres along the ground the drone will fly from its bay. */
  reach: 600,
  /** Metres per second in flight. */
  speed: 30,
  /** Share of the pilot's building speed. */
  build: 0.6,
  /** Hull per second it puts back. */
  repair: 4,
} as const;

export type WorkerJob = {
  kind: 'build' | 'repair';
  /** Order id for a build, building id for a repair. */
  target: number;
  leg: 'out' | 'work' | 'back';
  /** Seconds into the current leg. */
  t: number;
  /** Ground angle the job is at, for flying back and for drawing. */
  angle: number;
};

const bays = (world: WorldState): Building[] => world.colony.buildings.filter(b => b.kind === 'workerBay');

const metresBetween = (world: WorldState, a: number, b: number): number =>
  Math.abs(wrap(a - b)) * colonyPlanet(world).radius;

/** Seconds to fly between the bay and the job. */
const flight = (world: WorldState, bay: Building, angle: number): number =>
  Math.max(1, metresBetween(world, bay.angle, angle) / WORKER.speed);

/** Whether a worker drone is at a construction order now, building it. */
export function droneBuilding(world: WorldState, orderId: number): boolean {
  return bays(world).some(b => b.job?.kind === 'build' && b.job.target === orderId && b.job.leg === 'work');
}

const claimed = (world: WorldState, self: Building, kind: WorkerJob['kind'], target: number): boolean =>
  bays(world).some(b => b !== self && b.job?.kind === kind && b.job.target === target && b.job.leg !== 'back');

const hullPerAlloy = (world: WorldState): number => (world.colony.research.completed.includes('fieldRepair') ? 20 : 10);

/** The next job for a bay: the order being built first, then the most damaged building in reach. */
function nextJob(world: WorldState, bay: Building): WorkerJob | null {
  const order = world.colony.command.queue.find(o => !o.paused);
  if (order && metresBetween(world, bay.angle, order.angle) <= WORKER.reach && !claimed(world, bay, 'build', order.id)) {
    return { kind: 'build', target: order.id, leg: 'out', t: 0, angle: order.angle };
  }
  if (availableProduct(world.colony, 'alloy') <= 1e-6) return null;
  const damaged = world.colony.buildings
    .filter(b => b !== bay && buildingHealth(b) < 100 - 1e-6)
    .filter(b => metresBetween(world, bay.angle, b.angle) <= WORKER.reach && !claimed(world, bay, 'repair', b.id))
    .sort((a, b) => buildingHealth(a) - buildingHealth(b) || a.id - b.id)[0];
  return damaged ? { kind: 'repair', target: damaged.id, leg: 'out', t: 0, angle: damaged.angle } : null;
}

/** Whether the job still has something to do. */
function jobOpen(world: WorldState, job: WorkerJob): boolean {
  if (job.kind === 'build') return world.colony.command.queue.some(o => o.id === job.target && !o.paused);
  const b = world.colony.buildings.find(x => x.id === job.target);
  return !!b && buildingHealth(b) < 100 - 1e-6 && availableProduct(world.colony, 'alloy') > 1e-6;
}

function repairStep(world: WorldState, job: WorkerJob, dt: number): void {
  const b = world.colony.buildings.find(x => x.id === job.target);
  if (!b) return;
  const rate = hullPerAlloy(world);
  const amount = Math.min(WORKER.repair * dt, 100 - buildingHealth(b), availableProduct(world.colony, 'alloy') * rate);
  if (amount <= 0) return;
  const wasWrecked = !operational(b);
  b.health = Math.min(100, buildingHealth(b) + amount);
  world.colony.products.alloy = Math.max(0, world.colony.products.alloy - amount / rate);
  if (wasWrecked && operational(b)) b.status = 'idle';
}

export function stepWorkerBay(world: WorldState, bay: Building, dt: number): void {
  const colony = world.colony;
  if (!bay.job) {
    const job = nextJob(world, bay);
    if (!job) {
      bay.status = 'idle';
      bay.requestedPower = 0;
      return;
    }
    bay.job = job;
  }
  const job = bay.job;
  const fraction = powerFraction(bay) * workFactor(bay);
  bay.requestedPower = WORKER.power * fraction;
  const work = dt * fraction;
  if (!work) {
    bay.status = 'power limited';
    return;
  }
  colony.demand += bay.requestedPower;
  const block = industrialPowerBlock(colony, WORKER.power * work);
  if (block) {
    bay.status = block;
    return;
  }
  colony.energy = Math.max(0, colony.energy - WORKER.power * work);
  bay.gridPower = bay.requestedPower;
  bay.status = 'running';
  job.t += work;
  const trip = flight(world, bay, job.angle);
  if (job.leg === 'out') {
    if (!jobOpen(world, job)) {
      job.leg = 'back';
      job.t = Math.max(0, trip - job.t);
    } else if (job.t >= trip) {
      job.leg = 'work';
      job.t = 0;
    }
    return;
  }
  if (job.leg === 'work') {
    if (job.kind === 'repair') repairStep(world, job, work);
    if (!jobOpen(world, job)) {
      job.leg = 'back';
      job.t = 0;
    }
    return;
  }
  if (job.t >= trip) bay.job = undefined;
}

/** Where the drone is, as a ground angle and a height (m), or null when it is in its bay. For drawing. */
export function workerPosition(world: WorldState, bay: Building): { angle: number; height: number } | null {
  const job = bay.job;
  if (!job) return null;
  if (job.leg === 'work') return { angle: job.angle, height: 34 };
  const trip = flight(world, bay, job.angle);
  const along = Math.min(1, job.t / trip);
  const from = job.leg === 'out' ? bay.angle : job.angle;
  const to = job.leg === 'out' ? job.angle : bay.angle;
  const angle = from + wrap(to - from) * along;
  return { angle, height: 34 + 20 * Math.sin(Math.PI * along) };
}
