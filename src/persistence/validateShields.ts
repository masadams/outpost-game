import { SHIELDS, SHIELD, isShield } from '../sim/shieldConfig';
import type { WorldState } from '../sim/world';
const number = (v: unknown, max = 1e15): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
export function validShields(w: WorldState): boolean {
  const l = w.colony.shielding;
  if (!l || ![l.hits, l.breaches, l.absorbed, l.dustMass, l.dissipatedEnergy, l.lostCharge, l.energyUsed].every(v => number(v))) return false;
  if (!Number.isInteger(l.hits) || !Number.isInteger(l.breaches) || l.breaches > l.hits) return false;
  for (const b of w.colony.buildings) {
    if (!isShield(b.kind)) { if (b.shield !== undefined) return false; continue; }
    const h = b.shield;
    if (!h || !number(h.charge, SHIELDS[b.kind].capacity) || !number(h.delay, SHIELD.delay) || !number(h.recovery, SHIELD.recovery) || !number(h.flash, .25) || typeof h.powered !== 'boolean' || typeof h.ready !== 'boolean') return false;
    if (h.ready && (h.charge <= 0 || h.recovery > 1e-9)) return false;
    if ((b.health ?? 100) <= 0 && (h.charge > 0 || h.powered || h.ready)) return false;
    if (!w.colony.research.completed.includes('combat')) return false;
  }
  return w.defence.meteors.every(m => m.impactBudget === undefined || number(m.impactBudget, 180) && m.impactBudget > 0) && w.combat.projectiles.every(p => p.shieldScale === undefined || p.owner === 'enemy' && number(p.shieldScale, 1) && p.shieldScale > 0);
}
