import { BODY_IDS } from '../sim/celestial';
import { TECH_IDS, TECHNOLOGIES, UPGRADE_IDS, UPGRADES, PART_SLOTS } from '../sim/progressionConfig';
import type { WorldState } from '../sim/world';
const num = (v: unknown, max = 1e9): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
export function validProgression(w: WorldState): boolean {
  const r = w.colony.research, equipment = w.ship.equipment;
  if (!r || !Array.isArray(r.completed) || r.completed.length > TECH_IDS.length || !r.completed.every(t => TECH_IDS.includes(t)) || new Set(r.completed).size !== r.completed.length || !Array.isArray(r.queue) || r.queue.length > TECH_IDS.length || !num(r.energyUsed)) return false;
  if (!r.completed.every(t => TECHNOLOGIES[t].requires.every(p => r.completed.includes(p)))) return false;
  if (!r.queue.every(p => !!p && (BODY_IDS as readonly string[]).includes(p.funding) && TECH_IDS.includes(p.tech) && !r.completed.includes(p.tech) && TECHNOLOGIES[p.tech].requires.every(t => r.completed.includes(t)) && num(p.progress, TECHNOLOGIES[p.tech].seconds) && p.progress < TECHNOLOGIES[p.tech].seconds && typeof p.paused === 'boolean')) return false;
  if (new Set(r.queue.map(p => p.tech)).size !== r.queue.length) return false;
  return Array.isArray(equipment) && equipment.length <= PART_SLOTS.length && new Set(equipment).size === equipment.length && equipment.every(id => UPGRADE_IDS.includes(id) && r.completed.includes(UPGRADES[id].tech)) && new Set(equipment.map(id=>UPGRADES[id].slot)).size===equipment.length;
}
