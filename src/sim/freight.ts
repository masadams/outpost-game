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

/** Everything in the freight bay goes into the local stores. Done by pressing E on the pad. Returns kg moved. */
export function unloadFreight(w: WorldState): number {
  let moved = 0;
  for (const p of PRODUCTS) {
    const amount = w.ship.freight[p];
    if (amount <= 0) continue;
    w.ship.freight[p] = 0;
    w.colony.products[p] += amount;
    moved += amount;
  }
  return moved;
}

export function loadDepotOre(w: WorldState, resource: Resource): void {
  if (!RESOURCES.includes(resource)) return;
  const error = freightError(w); if (error) { notify(w, error); return; }
  const amount = Math.max(0, Math.min(5, w.depot[resource], cargoCapacity(w.ship) - cargoMass(w.ship)));
  w.depot[resource] -= amount; w.ship.cargo[resource] += amount;
  notify(w, amount ? `${resource.toUpperCase()} ORE LOADED · ${amount.toFixed(1)} kg` : 'NO ORE OR CARGO ROOM');
}

/** Why ore cannot be loaded from this depot right now, or null. Only away from home: at home the ore is for the refinery. */
export function haulError(w: WorldState): string | null {
  if ((w.siteBody ?? 'home') === 'home') return 'Haul ore from other worlds. At home it feeds your refinery.';
  const pad = freightError(w);
  if (pad) return 'Land on the pad here first.';
  if (RESOURCES.every(r => w.depot[r] <= 1e-6)) return 'No ore in the depot here.';
  if (cargoMass(w.ship) >= cargoCapacity(w.ship) - 1e-6) return 'Your hold is full.';
  return null;
}

/** Load as much of the local depot's ore as the hold takes. Returns kg moved. */
export function loadAllDepotOre(w: WorldState): number {
  const error = haulError(w);
  if (error) {
    notify(w, error);
    return 0;
  }
  let moved = 0;
  for (const r of RESOURCES) {
    const room = cargoCapacity(w.ship) - cargoMass(w.ship);
    const amount = Math.max(0, Math.min(w.depot[r], room));
    w.depot[r] -= amount;
    w.ship.cargo[r] += amount;
    moved += amount;
  }
  notify(w, `ORE LOADED · ${moved.toFixed(0)} kg. Fly home and press E on the pad.`);
  return moved;
}
