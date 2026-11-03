import { SHIELDS, SHIELD, isShield } from '../sim/shieldConfig';
import type { Building } from '../sim/colony';
import type { WorldState } from '../sim/world';
export function shieldDetails(b: Building): string {
  if (!isShield(b.kind) || !b.shield) return '';
  const s = SHIELDS[b.kind], h = b.shield;
  return `<p>Shield ${h.charge.toFixed(1)} / ${s.capacity} SP · ${b.status}</p><meter aria-label="Shield charge" min="0" max="${s.capacity}" value="${h.charge}"></meter><p>Radius ${s.radius} m · upkeep ${s.upkeep} kW<br>Recharge ≤ ${s.recharge} SP/s at 1 kJ/SP<br>Hit delay ${h.delay.toFixed(1)} s · recovery ${h.recovery.toFixed(1)} s</p><small>Rearms at ${SHIELD.rearmFraction * 100}% charge after ${SHIELD.recovery} s breach recovery. Incoming meteors and hostile shots only. Friendly traffic passes; threats already inside bypass the field. No oxygen or healing.</small>`;
}
export function shieldPanel(w: WorldState, accents: boolean): string {
  const l = w.colony.shielding;
  return `<details data-preserve-open><summary>Shields · protection and accounting</summary><label><input id="shield-accents" type="checkbox" ${accents ? 'checked' : ''}> Shield hit colour accents</label><p>${l.hits} hits · ${l.breaches} breaches · ${l.absorbed.toFixed(1)} SP absorbed<br>Grid spent ${l.energyUsed.toFixed(1)} kJ · discarded charge ${l.lostCharge.toFixed(1)} SP<br>Non-collectible dust ${l.dustMass.toFixed(1)} kg · dissipated ${(l.dissipatedEnergy / 1000).toFixed(1)} kJ</p><small>Combat engineering unlocks both emitters. Construct empty; supply solar and storage to charge. Select an emitter for charge and power controls. Overlapping domes absorb sequentially at their physical boundaries. Protection points (SP) are damage capacity, not stored kinetic energy.</small></details>`;
}
