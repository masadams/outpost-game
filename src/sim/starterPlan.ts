import { BLUEPRINTS, PRODUCTS, REFINERY_RECIPES, type ProductInventory, type BuildType } from './colonyConfig';
import { TECHNOLOGIES, UPGRADES, PROGRESSION } from './progressionConfig';
import { availableProduct, policyFor } from './colonyPolicy';
import { operational } from './buildingHealth';
import { emptyInventory, RESOURCES } from './resources';
import type { WorldState } from './world';

/** Remaining bill for a home solar/refinery → materials research → cargo-rack route.
 * Paid orders count as committed work, never as completed/working facilities. */
export function starterPlan(source: WorldState) {
  const w = source.rootWorld ?? source, c = w.colony;
  const required = Object.fromEntries(PRODUCTS.map(p => [p, 0])) as ProductInventory;
  const missing: string[] = [], pending: string[] = [];
  const add = (cost: Partial<ProductInventory>) => { for (const p of PRODUCTS) required[p] += cost[p] ?? 0; };
  const facility = (kind: BuildType) => {
    if (c.buildings.some(b => b.kind === kind && operational(b))) return;
    if (c.command.queue.some(o => o.kind === kind)) pending.push(`${BLUEPRINTS[kind].label}: paid work queued`);
    else { add(BLUEPRINTS[kind].cost); missing.push(BLUEPRINTS[kind].label); }
  };
  facility('solar'); facility('refinery');
  const researched = c.research.completed.includes('materials'), project = c.research.queue.find(p => p.tech === 'materials');
  if (!researched) {
    facility('researchLab');
    if (project) pending.push('Applied materials: paid research queued');
    else { add(TECHNOLOGIES.materials.cost); missing.push('Applied materials research'); }
  }
  const equipped = w.ship.equipment.includes('cargo');
  if (!equipped) { add(UPGRADES.cargo.cost); missing.push('Cargo rack'); }
  const rows = PRODUCTS.filter(p => required[p] > 0).map(product => {
    const usable = availableProduct(c, product), need = required[product];
    return { product, need, usable, shortfall: Math.max(0, need - usable) };
  });
  const raw = emptyInventory();
  for (const row of rows) {
    const recipe = REFINERY_RECIPES.find(r => (r.output[row.product] ?? 0) > 0);
    if (recipe) {
      const cycles = Math.max(0, Math.ceil((row.shortfall - 1e-9) / recipe.output[row.product]!));
      for (const resource of RESOURCES) raw[resource] += (recipe.raw[resource] ?? 0) * cycles;
    }
  }
  return { required, rows, missing, pending,
    raw: RESOURCES.filter(r => raw[r] > 0).map(resource => ({ resource, need: raw[resource], inDepot: w.depot[resource], shortfall: Math.max(0, raw[resource] - w.depot[resource]) })),
    researchEnergy: researched ? 0 : Math.max(0, TECHNOLOGIES.materials.seconds - (project?.progress ?? 0)) * PROGRESSION.labPower,
    fabricationEnergy: equipped ? 0 : PROGRESSION.fabricationEnergy,
    usableEnergy: Math.max(0, c.energy - policyFor(c).energyReserve),
  };
}
