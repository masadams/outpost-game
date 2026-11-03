import { BLUEPRINTS, PRODUCTS } from './colonyConfig';
import { HABITATS, isHabitat } from './habitatConfig';
import { ventHabitat } from './habitats';
import { availableProduct } from './colonyPolicy';
import { energyCapacity, oreCapacity, productCapacity, nearbyBuilding } from './colony';
import { WORLD } from './config';
import { inventoryMass, RESOURCES } from './resources';
import { localAngle, wrap, type Vec } from './math';
import { notify } from './messages';
import type { WorldState } from './world';

import { buildingHealth, operational } from './buildingHealth';
export function constrainDamagedStorage(world: WorldState): void {
  const c = world.colony, mass = inventoryMass(world.depot), capacity = oreCapacity(c);
  if (mass > capacity) {
    world.defence.lostStock += mass - capacity;
    for (const r of RESOURCES) world.depot[r] *= capacity / mass;
  }
  for (const p of PRODUCTS) { const excess = Math.max(0, c.products[p] - productCapacity(c)); world.defence.lostStock += excess; c.products[p] -= excess; }
  c.energy = Math.min(c.energy, energyCapacity(c));
}
export function damageColony(world: WorldState, position: Vec, damage: number, radius: number, label = 'METEOR IMPACT'): void {
  const angle = localAngle(position);
  let hit = false;
  for (const b of world.colony.buildings) {
    const distance = Math.abs(wrap(b.angle - angle)) * WORLD.radius;
    const reach = radius + (isHabitat(b.kind) ? HABITATS[b.kind].halfSpan : BLUEPRINTS[b.kind].halfWidth);
    if (distance >= reach || !operational(b)) continue;
    b.health = Math.max(0, buildingHealth(b) - damage * (1 - distance / reach)); hit = true;
    if (!operational(b)) { ventHabitat(world, b); b.status = 'wrecked'; if (world.defence.controlled === b.id) world.defence.controlled = null; }
  }
  const n = { x: Math.sin(angle), y: -Math.cos(angle) };
  const at = { x: n.x * WORLD.radius, y: n.y * WORLD.radius };
  const distanceShip = Math.hypot(at.x - world.ship.position.x, at.y - world.ship.position.y);
  if (distanceShip < radius) {
    world.ship.hull = Math.max(0, world.ship.hull - damage * (1 - distanceShip / radius)); world.ship.impact = 1;
    if (world.ship.hull === 0) { world.ship.state = 'crashed'; world.ship.velocity = { x: 0, y: 0 }; world.ship.thrusting = false; }
  }
  if (world.playerMode === 'astronaut') {
    const distanceSuit = Math.hypot(at.x - world.astronaut.position.x, at.y - world.astronaut.position.y);
    if (distanceSuit < radius) world.astronaut.health = Math.max(0, world.astronaut.health - damage * (1 - distanceSuit / radius));
  }
  constrainDamagedStorage(world);
  notify(world, hit ? `${label} · COLONY DAMAGED · U REPAIRS NEARBY FACILITY` : `${label} · KEEP CLEAR OF THE MARKED SITE`);
}
export function repairBuilding(world: WorldState): void {
  const b = nearbyBuilding(world);
  if (!b || !world.astronaut.grounded || world.astronaut.health <= 0) { notify(world, 'STAND WITHIN 18 m OF A FACILITY TO REPAIR'); return; }
  const amount = Math.min(100 - buildingHealth(b), availableProduct(world.colony, 'alloy') * 10);
  if (amount <= 0) { notify(world, operational(b) && buildingHealth(b) === 100 ? 'FACILITY UNDAMAGED' : 'REPAIR NEEDS UNRESERVED ALLOY · LOWER RESERVES IN COLONY'); return; }
  b.health = Math.min(100, buildingHealth(b) + amount); world.colony.products.alloy = Math.max(0, world.colony.products.alloy - amount / 10); b.status = 'idle';
  notify(world, `FACILITY REPAIRED · +${amount.toFixed(0)} HULL`);
}
