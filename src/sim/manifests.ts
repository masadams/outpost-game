import { availableProduct } from './colonyPolicy';
import { freightError } from './freight';
import { cargoMass } from './shipMass';
import { cargoCapacity } from './shipStats';
import { PRODUCTS, type ProductInventory } from './colonyConfig';
import { notify } from './messages';
import type { WorldState } from './world';

/** Target aboard quantities, not a repeatable grant. The starter rig/solar costs 12/5/3. */
export const MANIFESTS = {
  expedition: { label: 'Rig + solar expedition', stock: { alloy: 15, wire: 5, components: 5 }, detail: 'Build a rig and solar array, with 3 alloy / 2 components left for later work.' },
  nacreKit: { label: 'Nacre kit', stock: { alloy: 18, wire: 10, components: 5 }, detail: 'A mining rig, a solar array, a battery and a power relay.' },
  lifeSupport: { label: 'Small habitat + solar', stock: { alloy: 14, wire: 6, components: 4, oxygen: 4 }, detail: 'Hardware plus finite oxygen. Check habitat power and ongoing oxygen demand.' },
} satisfies Record<string, { label: string; stock: Partial<ProductInventory>; detail: string }>;
export type ManifestId = keyof typeof MANIFESTS;
export function manifestPlan(w: WorldState, id: ManifestId): { missing: ProductInventory; mass: number; error: string | null } {
  const spec: Partial<ProductInventory> = MANIFESTS[id].stock;
  const missing = Object.fromEntries(PRODUCTS.map(p => [p, Math.max(0, (spec[p] ?? 0) - w.ship.freight[p])])) as ProductInventory;
  const mass = PRODUCTS.reduce((sum, p) => sum + missing[p], 0);
  const error = freightError(w) ?? (mass <= 1e-9 ? 'Manifest already aboard' :
    PRODUCTS.some(p => availableProduct(w.colony, p) + 1e-9 < missing[p]) ? 'Insufficient unreserved local stock' :
    cargoMass(w.ship) + mass > cargoCapacity(w.ship) + 1e-9 ? 'Insufficient shared hold capacity' : null);
  return { missing, mass, error };
}
export function loadManifest(w: WorldState, id: ManifestId): void {
  if (!Object.hasOwn(MANIFESTS, id)) return;
  const plan = manifestPlan(w, id);
  if (plan.error) { notify(w, plan.error); return; }
  // Atomic: never strand half a manifest when stock/capacity fails. Already aboard stock counts.
  for (const p of PRODUCTS) { w.ship.freight[p] += plan.missing[p]; w.colony.products[p] -= plan.missing[p]; }
  notify(w, `${MANIFESTS[id].label.toUpperCase()} · ${plan.mass.toFixed(1)} kg loaded from local depot`);
}
