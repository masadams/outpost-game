import { resupplyArmament } from './combatSupply';
import { operational } from './buildingHealth';
import { availableProduct } from './colonyPolicy';
import { SUIT } from './astronaut';
import { WORLD } from './config';
import { notify } from './messages';
import { stationPosition } from './stations';
import type { Vec } from './math';
import type { Building } from './colony';
import type { WorldState } from './world';

export function refuelShip(world: WorldState, at: Vec): number {
  if (world.ship.state !== 'landed' || Math.hypot(at.x - world.ship.position.x, at.y - world.ship.position.y) > 80) return 0;
  const fuel = Math.min(WORLD.fuelCapacity - world.ship.fuel, world.colony.products.fuel);
  world.ship.fuel = Math.min(WORLD.fuelCapacity, world.ship.fuel + fuel); world.colony.products.fuel = Math.max(0, world.colony.products.fuel - fuel);
  return fuel;
}
export function serviceAtBuilding(world: WorldState, building: Building, crewPresent = true): void {
  if (!operational(building) || !building.enabled || world.colony.energy < 2) { notify(world, 'SERVICE NEEDS 2 kJ OF STORED POWER'); return; }
  world.colony.energy -= 2;
  const products = world.colony.products;
  const oxygen = crewPresent ? Math.min((SUIT.oxygen - world.astronaut.oxygen) / SUIT.oxygen, products.oxygen) : 0;
  world.astronaut.oxygen += oxygen * SUIT.oxygen; products.oxygen = Math.max(0, products.oxygen - oxygen);
  if (crewPresent) world.astronaut.health = 100;
  const at = stationPosition(building.angle);
  const near = world.ship.state === 'landed' && Math.hypot(at.x - world.ship.position.x, at.y - world.ship.position.y) <= 80;
  const repair = near ? Math.min(100 - world.ship.hull, availableProduct(world.colony, 'alloy') * 10) : 0;
  world.ship.hull += repair; products.alloy = Math.max(0, products.alloy - repair / 10);
  const fuel = refuelShip(world, at);
  if (near) resupplyArmament(world);
  notify(world, `SERVICE · O₂ +${(oxygen * SUIT.oxygen).toFixed(0)} s · HULL +${repair.toFixed(0)} · FUEL +${fuel.toFixed(1)} kg`);
}
