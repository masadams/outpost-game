import { EVENTS, EVENT_KINDS } from '../sim/events';
import { validStory } from '../sim/story';
import { validKeystones } from '../sim/keystones';
import { validSeedShip } from '../sim/seedShip';
import { validDeep } from '../sim/deepSpace';
import { BODY_IDS } from '../sim/celestial';
import { BELT_IDS, SITE_IDS, DESTINATIONS, EXPLORATION } from '../sim/explorationConfig';
import { inventoryMass, RESOURCES } from '../sim/resources';
import type { WorldState } from '../sim/world';
const num = (v: unknown, min = 0, max = 1e9): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const vec = (v: unknown): boolean => !!v && typeof v === 'object' && num((v as { x: number }).x, -1e9) && num((v as { y: number }).y, -1e9);
const kitOk = (k: unknown): boolean => !!k && typeof (k as { fuel: unknown }).fuel === 'boolean' && typeof (k as { shielding: unknown }).shielding === 'boolean' && typeof (k as { stores: unknown }).stores === 'boolean';
function validExpedition(x: NonNullable<WorldState['exploration']['expedition']>): boolean {
  if (!(Number.isInteger(x.count) && ['out', 'back'].includes(x.phase) && num(x.launchedAt, 0, 1e9) && num(x.returnsAt, 0, 1e9) && kitOk(x.kit) && kitOk(x.used))) return false;
  if (!(x.target === undefined || x.target === null || (Number.isInteger(x.target) && x.target >= 0 && x.target < 8))) return false;
  if (!(Number.isInteger(x.leg) && x.leg >= 0 && x.leg <= 4 && Number.isInteger(x.setbacks) && x.setbacks >= 0 && x.setbacks <= 4)) return false;
  if (!(x.pending === null || (!!x.pending && Number.isInteger(x.pending.leg) && num(x.pending.deadline, 0, 1e9) && (x.pending.kind === undefined || x.pending.kind === 'find')))) return false;
  if (!(x.salvage === undefined || num(x.salvage, 0, 2000))) return false;
  if (!Array.isArray(x.log) || x.log.length > 12 || !x.log.every(l => typeof l === 'string' && l.length < 200)) return false;
  return x.report === null || (!!x.report && ['full', 'partial', 'thin', 'lost'].includes(x.report.result) && Array.isArray(x.report.lines) && x.report.lines.length <= 14);
}
function validSupply(x: NonNullable<WorldState['exploration']['supply']>): boolean {
  if (!x || typeof x.enabled !== 'boolean' || !num(x.last, 0, 1e9) || typeof x.line !== 'string' || x.line.length > 200 || !x.reserves || typeof x.reserves !== 'object') return false;
  return Object.entries(x.reserves).every(([body, row]) => BODY_IDS.includes(body as never) && !!row && Object.entries(row).every(([r, kg]) => RESOURCES.includes(r as never) && num(kg, 0, 400)));
}
function validEvents(x: NonNullable<WorldState['exploration']['events']>): boolean {
  return !!x && num(x.next, 0, 1e9) && Number.isInteger(x.count) && x.count >= 0 && (x.last === undefined || EVENT_KINDS.includes(x.last))
    && Array.isArray(x.active) && x.active.length <= EVENTS.limit
    && x.active.every(a => !!a && Number.isInteger(a.id) && EVENT_KINDS.includes(a.kind) && num(a.starts, 0, 1e9) && num(a.ends, 0, 1e9) && a.ends >= a.starts && (a.seam === undefined || Number.isInteger(a.seam)))
    && Array.isArray(x.journal) && x.journal.length <= EVENTS.journalLimit && x.journal.every(l => typeof l === 'string' && l.length <= 200);
}

export function validExploration(w: WorldState): boolean {
  const e = w.exploration;
  if (!e || !DESTINATIONS.includes(e.selected) || !Array.isArray(e.surveyed) || !e.surveyed.every(b => BELT_IDS.includes(b)) || new Set(e.surveyed).size !== e.surveyed.length || !Array.isArray(e.sites) || e.sites.length > 3 || typeof e.returned !== 'boolean' || !Array.isArray(e.pods) || e.pods.length > 4 || !e.pods.every(p => !!p && Number.isInteger(p.id) && BODY_IDS.includes(p.from) && BODY_IDS.includes(p.to) && !!p.cargo && num(p.launched, 0, 1e9) && num(p.arrives, 0, 1e9) && typeof p.doomed === 'boolean') || !Array.isArray(e.hinted) || !e.hinted.every(id => BODY_IDS.includes(id)) || !Array.isArray(e.known) || !e.known.every(id => BODY_IDS.includes(id)) || new Set(e.known).size !== e.known.length || (e.mark !== null && !vec(e.mark)) || !Array.isArray(e.probes) || e.probes.length > 2 || !e.probes.every(p => !!p && Number.isInteger(p.id) && vec(p.position) && vec(p.velocity) && (p.target === 'mark' || BELT_IDS.includes(p.target)) && (p.point === undefined || vec(p.point)) && num(p.age, 0, 1e5) && num(p.dv, 0, 1e4)) || !['lying', 'carried', 'studied'].includes(e.crystal) || !['lying', 'carried', 'studied'].includes(e.core) || !num(e.watch) || e.watch < 0 || ![e.salvaged, e.refuelled, e.fuelLost].every(n => num(n))) return false;
  if (e.beacons !== undefined && (!Array.isArray(e.beacons) || e.beacons.length > 24 || !e.beacons.every(b => !!b && Number.isInteger(b.id) && BODY_IDS.includes(b.body) && BODY_IDS.includes(b.from) && ['landed', 'lost'].includes(b.kind) && num(b.kg, 0, 1e6) && num(b.angle, -4, 4) && num(b.until, 0, 1e9)))) return false;
  if (e.signal !== undefined && !(['sent', 'heard'].includes(e.signal.phase) && num(e.signal.sentAt, 0, 1e9) && num(e.signal.hearAt, 0, 1e9) && (e.signal.surveyed === undefined || (Array.isArray(e.signal.surveyed) && e.signal.surveyed.length <= 8 && e.signal.surveyed.every(n => Number.isInteger(n) && n >= 0 && n < 8))) && (e.signal.echo === null || (!!e.signal.echo && typeof e.signal.echo.name === 'string' && num(e.signal.echo.worlds, 1, 20) && num(e.signal.echo.lightHours, 0, 1e4) && num(e.signal.echo.bearing, -4, 4))))) return false;
  if (e.expedition !== undefined && !validExpedition(e.expedition)) return false;
  if (e.supply !== undefined && !validSupply(e.supply)) return false;
  if (e.events !== undefined && !validEvents(e.events)) return false;
  if (e.story !== undefined && !validStory(e.story)) return false;
  if (e.keystones !== undefined && !validKeystones(e.keystones)) return false;
  if (e.seedShip !== undefined && !validSeedShip(e.seedShip)) return false;
  if (e.deep !== undefined && !validDeep(e.deep)) return false;
  if (new Set(e.sites.map(s => s.key)).size !== e.sites.length) return false;
  if (!e.sites.every(s => !!s && SITE_IDS.includes(s.key) && Number.isInteger(s.id) && s.id > 0 && vec(s.position) && vec(s.velocity) && s.radius === EXPLORATION.siteRadius && s.resource === 'iron' && s.stage === 0 && s.maxHealth === 1 && num(s.health, 0, 1) && num(s.fuel, 0, 18) && !!s.stock && RESOURCES.every(r => num(s.stock[r], 0, 18)) && num(s.mass, EXPLORATION.dryMass, 200) && Math.abs(s.mass - EXPLORATION.dryMass - inventoryMass(s.stock) - s.fuel) < 1e-6 && (s.stock.copper <= 12 && s.stock.rareMetals <= 6 && s.stock.iron === 0 && s.stock.ice === 0 && s.stock.silicon === 0) && (s.key === 'cache' || inventoryMass(s.stock) === 0) && (s.key === 'tender' || s.fuel === 0) && (s.health > 0 || !s.fuel && !inventoryMass(s.stock)))) return false;
  const ids = [...w.asteroids, ...w.pickups, ...e.sites].map(b => b.id);
  if (new Set(ids).size !== ids.length || w.nextId <= Math.max(0, ...ids)) return false;
  return [...w.asteroids, ...w.pickups].every(b => b.belt === undefined || BELT_IDS.includes(b.belt));
}
