import { allColonies } from '../sim/localWorld';
import type { WorldState } from '../sim/world';
import { isTurret } from '../sim/defenceConfig';

const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, min = 0, max = 1e9): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const id = (v: unknown): v is number => num(v, 1) && Number.isInteger(v);
const vector = (v: unknown): boolean => object(v) && num(v.x, -1e9) && num(v.y, -1e9);
export function validDefence(world: WorldState): boolean {
  for (const b of world.colony.buildings) {
    if (b.health !== undefined && !num(b.health, 0, 100)) return false;
    if (b.turret !== undefined && (!isTurret(b.kind) || !object(b.turret) || !num(b.turret.aim, -1.4, 1.4) || !num(b.turret.cooldown, 0, 3) || typeof b.turret.automatic !== 'boolean')) return false;
  }
  const d = world.defence;
  if (!object(d) || !Array.isArray(d.meteors) || d.meteors.length > 48 || !Array.isArray(d.projectiles) || d.projectiles.length > 32 || !Array.isArray(d.beams) || d.beams.length > 96) return false;
  if (![d.wave, d.intercepted, d.impacts, d.shots].every(v => num(v) && Number.isInteger(v)) || !num(d.lostStock)) return false;
  if (d.controlled !== null && (!id(d.controlled) || !allColonies(world).some(site => site.colony.buildings.some(b => b.id === d.controlled && isTurret(b.kind))))) return false;
  if (!d.meteors.every(m => object(m) && id(m.id) && vector(m.position) && vector(m.velocity) && num(m.radius, 0.01, 200) && num(m.mass, 1e-12, 1e6) &&
    [0, 1].includes(m.stage) && m.resource === 'iron' && num(m.health, 0, 40) && num(m.maxHealth, 0.01, 40) && (m.lastHit === undefined || ['laser', 'flak', 'missile'].includes(m.lastHit)))) return false;
  if (!d.projectiles.every(p => object(p) && id(p.id) && ['flak', 'missile'].includes(p.kind) && (p.frameVelocity === undefined || vector(p.frameVelocity)) && vector(p.position) && vector(p.velocity) && num(p.life, 0, 20) && num(p.fuse, 0, 20) && (p.targetId === null || id(p.targetId)))) return false;
  if (!d.beams.every(b => object(b) && vector(b.start) && vector(b.end) && num(b.life, 0, 0.13))) return false;
  const ids = [...world.asteroids, ...world.pickups, ...d.meteors, ...d.projectiles].map(b => b.id);
  return new Set(ids).size === ids.length && world.nextId > Math.max(0, ...ids);
}
