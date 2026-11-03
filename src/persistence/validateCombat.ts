import type { WorldState } from '../sim/world';
const obj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, min = 0, max = 1e9): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const id = (v: unknown): v is number => num(v, 1) && Number.isInteger(v);
const vec = (v: unknown): boolean => obj(v) && num(v.x, -1e9) && num(v.y, -1e9);
export function validCombat(w: WorldState): boolean {
  const a = w.ship.armament, c = w.combat;
  if (!obj(a) || !['cannon', 'missile'].includes(a.selected) || !num(a.cannon, 0, 40) || !Number.isInteger(a.cannon) || !num(a.missile, 0, 2) || !Number.isInteger(a.missile) ||
    !num(a.energy, 0, 100) || !num(a.heat, 0, 100) || !num(a.cooldown, 0, 1.2) || typeof a.overheated !== 'boolean') return false;
  if (!obj(c) || !Array.isArray(c.enemies) || c.enemies.length > 3 || !Array.isArray(c.projectiles) || c.projectiles.length > 96 || !Array.isArray(c.flashes) || c.flashes.length > 64) return false;
  if (![c.encounters, c.kills, c.escaped, c.shots, c.enemyShots, c.recoveries].every(n => num(n) && Number.isInteger(n)) || !num(c.tier, 1, 3) || !Number.isInteger(c.tier) || !num(c.lostCargo) || !num(c.furthestAltitude)) return false;
  if (!c.enemies.every(d => obj(d) && id(d.id) && vec(d.position) && vec(d.velocity) && num(d.angle, -Math.PI, Math.PI) && num(d.hull, 0, 48) && num(d.fuel, 0, 120) && num(d.ammo, 0, 24) && Number.isInteger(d.ammo) &&
    num(d.energy, 0, 50) && num(d.cooldown, 0, 1.4) && num(d.windup, 0, 0.9) && num(d.retreatTime, 0, 25) && ['approach', 'attack', 'retreat'].includes(d.state))) return false;
  if (!c.projectiles.every(p => obj(p) && id(p.id) && ['ship', 'enemy'].includes(p.owner) && ['cannon', 'missile'].includes(p.kind) && vec(p.position) && vec(p.velocity) && num(p.life, 0, p.kind === 'missile' ? 12 : 5) && (p.targetId === null || id(p.targetId)) && (p.owner !== 'enemy' || p.kind === 'cannon') && (p.damage === undefined || num(p.damage, 0, 55)))) return false;
  if (!c.flashes.every(f => obj(f) && vec(f.position) && num(f.life, 0, 0.4))) return false;
  const ids = [...w.asteroids, ...w.pickups, ...w.defence.meteors, ...w.defence.projectiles, ...c.enemies, ...c.projectiles].map(v => v.id);
  return new Set(ids).size === ids.length && w.nextId > Math.max(0, ...ids);
}
