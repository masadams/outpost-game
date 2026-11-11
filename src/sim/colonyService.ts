import { colonyPlanet, localAngleAt, sitePosition } from './localWorld';
import { WORLD } from './config';
import { fuelCapacity } from './shipStats';
import { resupplyArmament } from './combatSupply';
import { operational } from './buildingHealth';
import { availableProduct } from './colonyPolicy';
import { SUIT } from './astronaut';
import { notify } from './messages';
import { wrap, type Vec } from './math';
import type { Building } from './colony';
import type { WorldState } from './world';

/** Whether the lander is sitting on this world's landing pad. Fuel only moves there. */
export function onPad(world: WorldState): boolean {
  if (world.ship.state !== 'landed') return false;
  const fromPad = Math.abs(wrap(localAngleAt(world, world.ship.position) - WORLD.padAngle)) * colonyPlanet(world).radius;
  return fromPad <= WORLD.padHalfWidth;
}

/** Moves fuel from this base's store into the lander. Only on the landing pad, and only within reach of `at`. */
export function refuelShip(world: WorldState, at: Vec): number {
  if (!onPad(world) || Math.hypot(at.x - world.ship.position.x, at.y - world.ship.position.y) > 80) return 0;
  const fuel = Math.min(fuelCapacity(world.ship) - world.ship.fuel, world.colony.products.fuel);
  world.ship.fuel = Math.min(fuelCapacity(world.ship), world.ship.fuel + fuel); world.colony.products.fuel = Math.max(0, world.colony.products.fuel - fuel);
  return fuel;
}
export function serviceAtBuilding(world: WorldState, building: Building, crewPresent = true): void {
  if (!operational(building) || !building.enabled || world.colony.energy < 2) { notify(world, 'SERVICE NEEDS 2 kJ OF STORED POWER'); return; }
  world.colony.energy -= 2;
  const products = world.colony.products;
  const oxygen = crewPresent ? Math.min((SUIT.oxygen - world.astronaut.oxygen) / SUIT.oxygen, products.oxygen) : 0;
  world.astronaut.oxygen += oxygen * SUIT.oxygen; products.oxygen = Math.max(0, products.oxygen - oxygen);
  if (crewPresent) world.astronaut.health = 100;
  const at = sitePosition(world, building.angle);
  const near = world.ship.state === 'landed' && Math.hypot(at.x - world.ship.position.x, at.y - world.ship.position.y) <= 80;
  const repair = near ? Math.min(100 - world.ship.hull, availableProduct(world.colony, 'alloy') * 10) : 0;
  world.ship.hull += repair; products.alloy = Math.max(0, products.alloy - repair / 10);
  const fuel = refuelShip(world, at);
  if (near) resupplyArmament(world);
  notify(world, `SERVICE · O₂ +${(oxygen * SUIT.oxygen).toFixed(0)} s · HULL +${repair.toFixed(0)} · FUEL +${fuel.toFixed(1)} kg`);
}
