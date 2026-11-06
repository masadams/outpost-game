import { BELT_IDS, SITE_IDS, DESTINATIONS, EXPLORATION } from '../sim/explorationConfig';
import { inventoryMass, RESOURCES } from '../sim/resources';
import type { WorldState } from '../sim/world';
const num = (v: unknown, min = 0, max = 1e9): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const vec = (v: unknown): boolean => !!v && typeof v === 'object' && num((v as { x: number }).x, -1e9) && num((v as { y: number }).y, -1e9);
export function validExploration(w: WorldState): boolean {
  const e = w.exploration;
  if (!e || !DESTINATIONS.includes(e.selected) || !Array.isArray(e.surveyed) || !e.surveyed.every(b => BELT_IDS.includes(b)) || new Set(e.surveyed).size !== e.surveyed.length || !Array.isArray(e.sites) || e.sites.length > 3 || typeof e.returned !== 'boolean' || typeof e.nacreSurveyed !== 'boolean' || (e.mark !== null && !vec(e.mark)) || !Array.isArray(e.probes) || e.probes.length > 2 || !e.probes.every(p => !!p && Number.isInteger(p.id) && vec(p.position) && vec(p.velocity) && (p.target === 'mark' || BELT_IDS.includes(p.target)) && (p.point === undefined || vec(p.point)) && num(p.age, 0, 1e5) && num(p.dv, 0, 1e4)) || !['lying', 'carried', 'studied'].includes(e.crystal) || !num(e.nacreWatch) || e.nacreWatch < 0 || ![e.salvaged, e.refuelled, e.fuelLost].every(n => num(n))) return false;
  if (new Set(e.sites.map(s => s.key)).size !== e.sites.length) return false;
  if (!e.sites.every(s => !!s && SITE_IDS.includes(s.key) && Number.isInteger(s.id) && s.id > 0 && vec(s.position) && vec(s.velocity) && s.radius === EXPLORATION.siteRadius && s.resource === 'iron' && s.stage === 0 && s.maxHealth === 1 && num(s.health, 0, 1) && num(s.fuel, 0, 18) && !!s.stock && RESOURCES.every(r => num(s.stock[r], 0, 18)) && num(s.mass, EXPLORATION.dryMass, 200) && Math.abs(s.mass - EXPLORATION.dryMass - inventoryMass(s.stock) - s.fuel) < 1e-6 && (s.stock.copper <= 12 && s.stock.rareMetals <= 6 && s.stock.iron === 0 && s.stock.ice === 0 && s.stock.silicon === 0) && (s.key === 'cache' || inventoryMass(s.stock) === 0) && (s.key === 'tender' || s.fuel === 0) && (s.health > 0 || !s.fuel && !inventoryMass(s.stock)))) return false;
  const ids = [...w.asteroids, ...w.pickups, ...e.sites].map(b => b.id);
  if (new Set(ids).size !== ids.length || w.nextId <= Math.max(0, ...ids)) return false;
  return [...w.asteroids, ...w.pickups].every(b => b.belt === undefined || BELT_IDS.includes(b.belt));
}
