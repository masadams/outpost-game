import { BUILD_TYPES } from '../sim/colonyConfig';
import { CONSTRUCTION_SECONDS } from '../sim/commandConfig';
import type { WorldState } from '../sim/world';
const num = (v: unknown, min = 0, max = 1e9): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
export function validCommand(w: WorldState): boolean {
  const c = w.colony.command;
  if (!c || !Array.isArray(c.queue) || c.queue.length > 16 || c.queue.length + w.colony.buildings.length > 48 || !num(c.elapsed) || !Number.isInteger(c.nextId) || c.nextId <= 0) return false;
  if (!c.queue.every(o => !!o && Number.isInteger(o.id) && o.id > 0 && BUILD_TYPES.includes(o.kind) && num(o.angle, -Math.PI, Math.PI) && num(o.progress, 0, CONSTRUCTION_SECONDS) && typeof o.paused === 'boolean' && typeof o.status === 'string' && o.status.length <= 160)) return false;
  if (new Set(c.queue.map(o => o.id)).size !== c.queue.length || c.nextId <= Math.max(0, ...c.queue.map(o => o.id))) return false;
  return w.colony.buildings.every(b => (b.dispatch === undefined || !!b.dispatch && Number.isInteger(b.dispatch.rank) && num(b.dispatch.rank, 0, 47) && Number.isInteger(b.dispatch.limit) && num(b.dispatch.limit, 0, 100)) && (b.gridPower === undefined || num(b.gridPower, 0, 1e6)) && (b.requestedPower === undefined || num(b.requestedPower, 0, 1e6)));
}
