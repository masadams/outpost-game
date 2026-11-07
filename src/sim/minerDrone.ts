import { workFactor } from './facilityStats';
import { colonyPlanet } from './localWorld';
import { powerFraction } from './power';
import { inventoryMass } from './resources';
import { industrialPowerBlock, policyFor } from './colonyPolicy';
import { buildingHealth } from './buildingHealth';
import { wrap } from './math';
import { DRONE } from './droneConfig';
import type { SurfaceDeposit } from './geology';
import type { WorldState } from './world';
import type { Building } from './colony';


/** The seam this bay would work now: the closest one with ore left inside its reach. */
export function droneSeam(world: WorldState, bay: Building): SurfaceDeposit | undefined {
  const radius = colonyPlanet(world).radius;
  const within = world.surfaceDeposits
    .map(d => ({ d, gap: Math.abs(wrap(bay.angle - d.angle)) * radius - d.halfWidth }))
    .filter(v => v.gap <= DRONE.reach);
  const live = within.filter(v => v.d.remaining > 1e-9).sort((a, b) => a.gap - b.gap || a.d.id - b.d.id);
  return live[0]?.d ?? within[0]?.d;
}

export function stepMinerDrone(world: WorldState, bay: Building, dt: number, capacity: number): void {
  const colony = world.colony;
  const seam = droneSeam(world, bay);
  if (!seam) {
    bay.status = 'no deposit';
    return;
  }
  if (seam.remaining <= 1e-9) {
    bay.status = 'depleted';
    bay.progress = 0;
    return;
  }
  if (buildingHealth(bay) <= DRONE.grounded) {
    bay.status = 'worn out';
    return;
  }
  const physicalRoom = capacity - inventoryMass(world.depot);
  if (physicalRoom - policyFor(colony).deliveryReserve <= 1e-9) {
    bay.status = physicalRoom <= 1e-9 ? 'output full' : 'delivery reserved';
    return;
  }
  if (bay.progress < 1e-9 && colony.products.fuel + 1e-9 < DRONE.fuel) {
    bay.status = 'no fuel';
    return;
  }
  const fraction = powerFraction(bay) * workFactor(bay);
  bay.requestedPower = DRONE.power * fraction;
  const work = dt * fraction;
  if (!work) {
    bay.status = 'power limited';
    return;
  }
  colony.demand += bay.requestedPower;
  const block = industrialPowerBlock(colony, DRONE.power * work);
  if (block) {
    bay.status = block;
    return;
  }
  colony.energy = Math.max(0, colony.energy - DRONE.power * work);
  bay.gridPower = bay.requestedPower;
  if (bay.progress < 1e-9) colony.products.fuel -= DRONE.fuel;
  bay.progress += work;
  bay.status = 'running';
  if (bay.progress + 1e-9 < DRONE.seconds) return;
  const room = physicalRoom - policyFor(colony).deliveryReserve;
  const amount = Math.min(DRONE.yield, seam.remaining, room);
  bay.progress = 0;
  seam.remaining = Math.max(0, seam.remaining - amount);
  world.depot[seam.resource] += amount;
  bay.health = Math.max(0, buildingHealth(bay) - DRONE.wear);
}
