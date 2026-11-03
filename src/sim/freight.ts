import { RESOURCES, type Resource } from './resources';
import { PRODUCTS, type Product } from './colonyConfig';
import { availableProduct } from './colonyPolicy';
import { cargoCapacity } from './shipStats';
import { cargoMass } from './shipMass';
import { productCapacity } from './colony';
import { colonyPlanet, localAngleAt, localPosition } from './localWorld';
import { WORLD } from './config';
import { notify } from './messages';
import type { WorldState } from './world';
export function freightError(w: WorldState): string | null {
  const s = w.ship, p = colonyPlanet(w);
  if (s.state !== 'landed' || Math.abs(Math.hypot(localPosition(w, s.position).x, localPosition(w, s.position).y) - p.radius - WORLD.shipRadius) > .2 || Math.abs(localAngleAt(w, s.position)) * p.radius > WORLD.padHalfWidth) return 'Land on this world’s marked pad to transfer freight';
  if (w.playerMode === 'astronaut' && (!w.astronaut.grounded || w.astronaut.health <= 0 || Math.hypot(w.astronaut.position.x - s.position.x, w.astronaut.position.y - s.position.y) > 20)) return 'Board or stand beside the landed ship';
  return null;
}
export function transferFreight(w: WorldState, product: Product, delta: number): void {
  if (!PRODUCTS.includes(product) || ![-5, 5].includes(delta)) return;
  const error = freightError(w); if (error) { notify(w, error); return; }
  const amount = delta > 0 ? Math.max(0, Math.min(delta, availableProduct(w.colony, product), cargoCapacity(w.ship) - cargoMass(w.ship))) : Math.max(0, Math.min(-delta, w.ship.freight[product], productCapacity(w.colony) - w.colony.products[product]));
  const signed = delta > 0 ? amount : -amount;
  w.ship.freight[product] += signed; w.colony.products[product] = Math.max(0, w.colony.products[product] - signed);
  notify(w, amount ? `${product.toUpperCase()} FREIGHT ${delta > 0 ? 'LOADED' : 'UNLOADED'} · ${amount.toFixed(1)} kg` : 'NO TRANSFER · CHECK STOCK, RESERVES AND CARGO ROOM');
}

export function loadDepotOre(w: WorldState, resource: Resource): void {
  if (!RESOURCES.includes(resource)) return;
  const error = freightError(w); if (error) { notify(w, error); return; }
  const amount = Math.max(0, Math.min(5, w.depot[resource], cargoCapacity(w.ship) - cargoMass(w.ship)));
  w.depot[resource] -= amount; w.ship.cargo[resource] += amount;
  notify(w, amount ? `${resource.toUpperCase()} ORE LOADED · ${amount.toFixed(1)} kg` : 'NO ORE OR CARGO ROOM');
}
