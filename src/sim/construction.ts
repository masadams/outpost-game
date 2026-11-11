import { droneBuildRate, droneBuilding } from './workerBay';
import { createSchedule } from './scheduling';
import { nearestPlanet, relativeVelocity } from './celestial';
import { allocateBuildingId, colonyPlanet, localAngleAt } from './localWorld';
import { isShield, createShield } from './shieldConfig';
import { orderedBuildings } from './power';
import { createHabitat, isHabitat } from './habitatConfig';
import { depositAt } from './geology';
import { BLUEPRINTS, PRODUCTS, type BuildType } from './colonyConfig';
import { placementError, productCapacity, type Building } from './colony';
import { CONSTRUCTION_SECONDS, type ConstructionOrder } from './commandConfig';
import { length, wrap } from './math';
import { notify } from './messages';
import { needsBoot } from './boot';
import type { WorldState } from './world';
export function completedBuilding(id: number, kind: BuildType, angle: number, w: WorldState): Building {
  const configured = w.colony.buildings.some(b => b.dispatch !== undefined);
  if (configured) orderedBuildings(w.colony).forEach((b, rank) => { b.dispatch = { rank, limit: b.dispatch?.limit ?? 100 }; });
  return { ...(configured ? { dispatch: { rank: w.colony.buildings.length, limit: 100 } } : {}), id, kind, angle, health: 100, enabled: true, progress: 0, recipe: 0, status: 'idle',
    ...(isShield(kind) ? { shield: createShield() } : {}),
    ...(isHabitat(kind) ? { habitat: createHabitat() } : {}),
    ...(kind === 'miningRig' ? { depositId: depositAt(w.surfaceDeposits, angle, BLUEPRINTS[kind].halfWidth, colonyPlanet(w).radius)!.id } : {}) };
}
/** Validate paid sites against other reservations without pretending the pilot is the worker. */
export function orderError(w: WorldState, kind: BuildType, angle: number, omit?: number): string | null {
  if(omit===undefined&&w.colony.command.queue.length>=16)return 'Queue limit: 16 orders';
  const reservations = w.colony.command.queue.filter(o => o.id !== omit).map(o => ({ id: -o.id, kind: o.kind, angle: o.angle } as Building));
  return placementError(w, kind, angle, { remote: true, paid: omit !== undefined, reservations });
}
export function cancelOrder(w: WorldState, o: ConstructionOrder): void {
  const fraction = Math.max(0, 1 - o.progress / CONSTRUCTION_SECONDS), stock = w.colony.products;
  if (PRODUCTS.some(p => stock[p] + (BLUEPRINTS[o.kind].cost[p] ?? 0) * fraction > productCapacity(w.colony) + 1e-9)) { notify(w, 'MAKE PRODUCT STORAGE ROOM BEFORE CANCELLING'); return; }
  for (const p of PRODUCTS) stock[p] += (BLUEPRINTS[o.kind].cost[p] ?? 0) * fraction;
  w.colony.command.queue = w.colony.command.queue.filter(q => q.id !== o.id);
  notify(w, 'ORDER CANCELLED · UNWORKED MATERIALS RETURNED');
}
export function stepConstruction(w: WorldState, dt: number): void {
  const command = w.colony.command; command.elapsed += dt;
  const o = command.queue.find(o => !o.paused);
  for (const q of command.queue) q.status = q.paused ? 'paused' : q === o ? q.status : 'queued';
  if (!o) return;
  const error = orderError(w, o.kind, o.angle, o.id); if (error) { o.status = error; return; }
  const suit = w.astronaut;
  const crew = nearestPlanet(suit.position, w.system).id === colonyPlanet(w).id && w.playerMode === 'astronaut' && suit.grounded && suit.health > 0
    && length(relativeVelocity(suit.velocity, colonyPlanet(w), suit.position)) <= .5
    && Math.abs(wrap(o.angle - localAngleAt(w, suit.position))) * colonyPlanet(w).radius <= 96;
  // A worker drone at the site builds too, more slowly; the pilot on the spot builds at full speed.
  const drone = !crew && droneBuilding(w, o.id);
  if (!crew && !drone) { o.status = 'waiting for stationary crew within 96 m'; return; }
  o.progress = Math.min(CONSTRUCTION_SECONDS, o.progress + dt * (crew ? 1 : droneBuildRate(w)));
  o.status = crew ? 'crew building' : 'drone building';
  if (o.progress + 1e-9 < CONSTRUCTION_SECONDS) return;
  const finished = completedBuilding(allocateBuildingId(w), o.kind, o.angle, w);
  // A freshly built machine has to warm up before it works.
  if (needsBoot(o.kind) && w.system.sun) finished.boot = 0;
  // New refineries pick their own recipe from what the base is short of.
  if (o.kind === 'refinery' && w.system.sun) finished.schedule = { ...createSchedule(), enabled: true };
  w.colony.buildings.push(finished);
  command.queue = command.queue.filter(q => q.id !== o.id); notify(w, `${BLUEPRINTS[o.kind].label.toUpperCase()} ORDER COMPLETE`);
}
