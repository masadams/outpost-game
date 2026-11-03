import { WORLD } from './config';
import { localAngle, wrap } from './math';
import { SHIP_WEAPONS, type ShipWeapon } from './combatConfig';
import { notify } from './messages';
import { availableProduct } from './colonyPolicy';
import type { WorldState } from './world';

export function resupplyArmament(world: WorldState): number {
  if (world.ship.state !== 'landed') return 0;
  let rounds = 0;
  for (const kind of ['cannon', 'missile'] as ShipWeapon[]) {
    const spec = SHIP_WEAPONS[kind], a = world.ship.armament, stock = world.colony.products;
    const amount = Math.max(0, Math.min(spec.capacity - a[kind], Math.floor((availableProduct(world.colony, 'alloy') + 1e-9) / spec.alloy), spec.components ? Math.floor((availableProduct(world.colony, 'components') + 1e-9) / spec.components) : Infinity));
    a[kind] += amount; stock.alloy = Math.max(0, stock.alloy - amount * spec.alloy); stock.components = Math.max(0, stock.components - amount * spec.components); rounds += amount;
  }
  return rounds;
}
export function serviceCombatAtPad(world: WorldState): void {
  const s = world.ship;
  if (s.state !== 'landed' || Math.abs(Math.hypot(s.position.x, s.position.y) - WORLD.radius - WORLD.shipRadius) > 0.1 || Math.abs(wrap(localAngle(s.position))) * WORLD.radius > WORLD.padHalfWidth) return;
  const repair = Math.min(100 - world.ship.hull, availableProduct(world.colony, 'alloy') * 10);
  world.ship.hull = Math.min(100, world.ship.hull + repair); world.colony.products.alloy = Math.max(0, world.colony.products.alloy - repair / 10);
  const rounds = resupplyArmament(world);
  if (repair > 0 || rounds > 0) notify(world, `SHIP SERVICE · HULL +${repair.toFixed(0)} · AMMO +${rounds} · MATERIALS CONSUMED`);
  else if ((s.hull < 100 || s.armament.cannon < SHIP_WEAPONS.cannon.capacity || s.armament.missile < SHIP_WEAPONS.missile.capacity) &&
    (availableProduct(world.colony, 'alloy') < world.colony.products.alloy || availableProduct(world.colony, 'components') < world.colony.products.components)) notify(world, 'SHIP SERVICE · MATERIALS RESERVED FOR TURRETS · LOWER RESERVES IN COLONY');
}
