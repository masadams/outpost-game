import { UPGRADES, UPGRADE_IDS, PROGRESSION, type UpgradeId, type ProgressionAction } from './progressionConfig';
import { PRODUCTS } from './colonyConfig';
import { productCapacity } from './colony';
import { availableProduct, industrialPowerBlock } from './colonyPolicy';
import { inventoryMass, CARGO_CAPACITY } from './resources';
import { WORLD } from './config';
import { localAngle, wrap } from './math';
import { notify } from './messages';
import type { WorldState } from './world';
export function shopError(w: WorldState): string | null {
  const s = w.ship;
  if (s.state !== 'landed' || Math.abs(Math.hypot(s.position.x, s.position.y) - WORLD.radius - WORLD.shipRadius) > .1 || Math.abs(wrap(localAngle(s.position))) * WORLD.radius > WORLD.padHalfWidth) return 'Land on the home pad for equipment work';
  if (w.playerMode === 'astronaut' && (!w.astronaut.grounded || w.astronaut.health <= 0 || Math.hypot(w.astronaut.position.x - s.position.x, w.astronaut.position.y - s.position.y) > 20)) return 'Board or stand within 20 m of the home-pad ship';
  return null;
}
export function equipmentError(w: WorldState, id: UpgradeId, operation: 'install' | 'remove'): string | null {
  if (!UPGRADE_IDS.includes(id)) return 'Unknown equipment';
  const at = shopError(w); if (at) return at;
  const spec = UPGRADES[id], s = w.ship, installed = s.equipment.includes(id);
  if (operation === 'install') {
    if (installed) return 'Already installed · no stacking';
    if (!w.colony.research.completed.includes(spec.tech)) return 'Research required before fabrication';
    if (PRODUCTS.some(p => availableProduct(w.colony, p) + 1e-9 < (spec.cost[p] ?? 0))) return 'Needs unreserved fabrication materials';
    if (industrialPowerBlock(w.colony, PROGRESSION.fabricationEnergy)) return 'Needs 20 kJ unreserved grid energy';
  } else {
    if (!installed) return 'Equipment is not installed';
    if (id === 'cargo' && inventoryMass(s.cargo) > CARGO_CAPACITY + 1e-9) return 'Unload cargo below 120 kg before removing rack';
    const excess = id === 'tank' ? Math.max(0, s.fuel - WORLD.fuelCapacity) : 0;
    if (PRODUCTS.some(p => w.colony.products[p] + (spec.cost[p] ?? 0) * PROGRESSION.salvageFraction * s.hull / 100 + (p === 'fuel' ? excess : 0) > productCapacity(w.colony) + 1e-9)) return 'Make stock room for salvage and excess tank fuel';
  }
  return null;
}
export function applyEquipment(w: WorldState, a: Extract<ProgressionAction, { type: 'equipment' }>): void {
  if (!['install', 'remove'].includes(a.operation)) return;
  const error = equipmentError(w, a.upgrade, a.operation); if (error) { notify(w, error); return; }
  const spec = UPGRADES[a.upgrade], s = w.ship;
  if (a.operation === 'install') {
    for (const p of PRODUCTS) w.colony.products[p] = Math.max(0, w.colony.products[p] - (spec.cost[p] ?? 0));
    w.colony.energy = Math.max(0, w.colony.energy - PROGRESSION.fabricationEnergy); s.equipment.push(a.upgrade);
    notify(w, `${spec.label.toUpperCase()} INSTALLED · +${spec.mass} kg · SUPPLIES PAID`);
  } else {
    const extra = a.upgrade === 'tank' ? Math.max(0, s.fuel - WORLD.fuelCapacity) : 0;
    s.fuel -= extra; w.colony.products.fuel += extra;
    for (const p of PRODUCTS) w.colony.products[p] += (spec.cost[p] ?? 0) * PROGRESSION.salvageFraction * s.hull / 100;
    s.equipment = s.equipment.filter(id => id !== a.upgrade); notify(w, 'MODULE REMOVED · HULL-SCALED 50% SALVAGE · EXCESS FUEL RETURNED');
  }
}
