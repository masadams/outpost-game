import { applyFacilityAction, type Building } from './colony';
import { BLUEPRINTS, BUILD_TYPES, PRODUCTS } from './colonyConfig';
import { SCHEDULE_PRODUCTS, type ScheduleProduct } from './scheduling';
import { cancelOrder, orderError } from './construction';
import { orderedBuildings, ratedPower } from './power';
import { turretState } from './weapons';
import { isTurret } from './defenceConfig';
import { operational } from './buildingHealth';
import { serviceAtBuilding } from './colonyService';
import { stationPosition } from './stations';
import { notify } from './messages';
import type { CommandAction } from './commandConfig';
import type { WorldState } from './world';
export function applyCommandAction(w: WorldState, a: CommandAction): void {
  const c = w.colony;
  if (w.playerMode === 'astronaut' ? w.astronaut.health <= 0 : w.ship.state === 'crashed') { notify(w, 'RECOVER BEFORE ISSUING COMMANDS'); return; }
  if (a.type === 'queueBuild') {
    if (!BUILD_TYPES.includes(a.kind) || c.command.queue.length >= 16) { notify(w, 'QUEUE LIMIT: 16 ORDERS'); return; }
    const error = orderError(w, a.kind, a.angle); if (error) { notify(w, error); return; }
    for (const p of PRODUCTS) c.products[p] = Math.max(0, c.products[p] - (BLUEPRINTS[a.kind].cost[p] ?? 0));
    c.command.queue.push({ id: c.command.nextId++, kind: a.kind, angle: a.angle, progress: 0, paused: false, status: 'queued' });
    notify(w, 'MATERIALS COMMITTED · CREW MUST WORK NEAR SITE'); return;
  }
  if (a.type === 'queueControl') {
    const o = c.command.queue.find(o => o.id === a.id); if (!o) return;
    if (a.operation === 'cancel') cancelOrder(w, o); else if (a.operation === 'pause') o.paused = !o.paused;
    return;
  }
  const b = c.buildings.find(b => b.id === a.id); if (!b) { notify(w, 'FACILITY NO LONGER EXISTS'); return; }
  if (a.type === 'priority') {
    const list = orderedBuildings(c).filter(other => other.id !== b.id), index = a.before === null ? list.length : list.findIndex(other => other.id === a.before);
    if (index < 0) return; list.splice(index, 0, b);
    list.forEach((other, rank) => { other.dispatch = { limit: other.dispatch?.limit ?? 100, rank }; }); return;
  }
  if (a.type === 'powerLimit') {
    if (!Number.isFinite(a.percent) || a.percent < 0 || a.percent > 100 || !ratedPower(b)) return;
    b.dispatch = { rank: b.dispatch?.rank ?? c.buildings.indexOf(b), limit: Math.round(a.percent) }; return;
  }
  if (a.type === 'remoteTarget') {
    if (!SCHEDULE_PRODUCTS.includes(a.product as ScheduleProduct) || ![-5, 5].includes(a.delta)) return;
    applyFacilityAction(w, b, { type: 'adjustTarget', product: a.product as ScheduleProduct, delta: a.delta as -5 | 5 }); return;
  }
  if (a.type !== 'remote') return;
  if (a.operation === 'toggle') applyFacilityAction(w, b, { type: 'toggleMachine' });
  else if (a.operation === 'recipe') applyFacilityAction(w, b, { type: 'cycleRecipe' });
  else if (a.operation === 'schedule') applyFacilityAction(w, b, { type: 'toggleSchedule' });
  else if (a.operation === 'auto' && isTurret(b.kind) && operational(b)) { const t = turretState(b); t.automatic = !t.automatic; }
  else if (a.operation === 'service' && b.kind === 'service') remoteService(w, b);
}
function remoteService(w: WorldState, b: Building): void {
  const at = stationPosition(b.angle), near = (p: { x: number; y: number }, range: number) => Math.hypot(p.x - at.x, p.y - at.y) <= range;
  const crew = w.playerMode === 'astronaut' && w.astronaut.grounded && near(w.astronaut.position, 18);
  if (!crew && !(w.ship.state === 'landed' && near(w.ship.position, 80))) { notify(w, 'SERVICE REQUIRES CREW OR LANDED SHIP AT THE FACILITY'); return; }
  serviceAtBuilding(w, b, crew);
}
