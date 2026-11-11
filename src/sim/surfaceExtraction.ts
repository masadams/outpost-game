import { eventRigFactor } from './events';
import {workFactor} from './facilityStats';
import { colonyPlanet } from './localWorld';
import { powerFraction } from './power';
import { GRADE_YIELD, RIG, rigDeposit, seamGrade } from './geology';
import { inventoryMass } from './resources';
import { industrialPowerBlock, policyFor } from './colonyPolicy';
import type { WorldState } from './world';
import type { Building } from './colony';

/** Shares a finite seam between all rigs; ore is debited only when it reaches storage. */
export function stepMiningRig(world: WorldState, building: Building, dt: number, capacity: number): void {
  const deposit = rigDeposit(world.surfaceDeposits, building, colonyPlanet(world).radius), colony = world.colony;
  if (!deposit) { building.status = 'no deposit'; return; }
  if (deposit.remaining <= 1e-9) { building.status = 'depleted'; building.progress = 0; return; }
  const physicalRoom = capacity - inventoryMass(world.depot), room = physicalRoom - policyFor(colony).deliveryReserve;
  if (room <= 1e-9) { building.status = physicalRoom <= 1e-9 ? 'output full' : 'delivery reserved'; return; }
  const work = dt * powerFraction(building) * workFactor(building); building.requestedPower = RIG.power * powerFraction(building) * workFactor(building);
  if (!work) { building.status = 'power limited'; return; }
  colony.demand += building.requestedPower;
  const block = industrialPowerBlock(colony, RIG.power * work);
  if (block) { building.status = block; return; }
  colony.energy = Math.max(0, colony.energy - RIG.power * work); building.gridPower = RIG.power * powerFraction(building) * workFactor(building); building.progress += work; building.status = 'running';
  if (building.progress + 1e-9 < RIG.seconds) return;
  const amount = Math.min(RIG.yield * GRADE_YIELD[seamGrade(deposit)] * eventRigFactor(world), deposit.remaining, room);
  building.progress = 0; deposit.remaining = Math.max(0, deposit.remaining - amount); world.depot[deposit.resource] += amount;
  if (deposit.remaining <= 1e-9) building.status = 'depleted';
}
