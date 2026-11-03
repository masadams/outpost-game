import { orderedBuildings } from './power';
import { isTurret, WEAPONS, type Projectile } from './defenceConfig';
import { WORLD } from './config';
import { clamp, heading, length, localAngle, wrap, type Vec } from './math';
import { rayCircle } from './mining';
import { surfaceHit } from './physics';
import { integrateVelocity } from './environment';
import { operational } from './buildingHealth';
import type { Building } from './colony';
import type { WorldState } from './world';

export function turretState(building: Building) {
  return building.turret ??= { aim: 0, cooldown: 0, automatic: false };
}
export function turretPosition(building: Building): Vec {
  const n = heading(building.angle); return { x: n.x * (WORLD.radius + 18), y: n.y * (WORLD.radius + 18) };
}
export function lineOfSight(start: Vec, end: Vec): boolean {
  return surfaceHit(start, end, WORLD.radius) === null;
}
function targetFor(world: WorldState, b: Building) {
  if (!isTurret(b.kind)) return undefined;
  const at = turretPosition(b), range = WEAPONS[b.kind].range;
  return world.defence.meteors.filter(m => Math.hypot(m.position.x - at.x, m.position.y - at.y) <= range && lineOfSight(at, m.position) &&
    Math.abs(wrap(localAngle({ x: m.position.x - at.x, y: m.position.y - at.y }) - b.angle)) <= 1.4)
    .sort((a, c) => length(a.position) - length(c.position) || a.id - c.id)[0];
}
function blast(world: WorldState, at: Vec, radius: number, damage: number): void {
  for (const m of world.defence.meteors) if (Math.hypot(m.position.x - at.x, m.position.y - at.y) <= radius + m.radius && lineOfSight(at, m.position)) m.health -= damage;
}
export function stepWeapons(world: WorldState, fire: boolean, turn: number, dt: number, starts: Map<number, Vec>): void {
  const defence = world.defence;
  defence.beams = defence.beams.filter(b => (b.life -= dt) > 0);
  for (const b of orderedBuildings(world.colony)) {
    if (!isTurret(b.kind)) continue;
    const state = turretState(b), spec = WEAPONS[b.kind], at = turretPosition(b);
    state.cooldown = Math.max(0, state.cooldown - dt);
    if (!operational(b) || !b.enabled) continue;
    const manual = defence.controlled === b.id, target = targetFor(world, b);
    if (manual) state.aim = clamp(state.aim + turn * 1.1 * dt, -1.4, 1.4);
    else if (state.automatic && target) {
      const flight = spec.speed ? Math.min(6, Math.hypot(target.position.x - at.x, target.position.y - at.y) / spec.speed) : 0;
      const desired = clamp(wrap(localAngle({ x: target.position.x + target.velocity.x * flight - at.x, y: target.position.y + target.velocity.y * flight - at.y }) - b.angle), -1.4, 1.4);
      state.aim += clamp(wrap(desired - state.aim), -1.5 * dt, 1.5 * dt);
      if (Math.abs(desired - state.aim) > 0.06) continue;
    }
    if (!(manual ? fire : state.automatic && target)) continue;
    b.requestedPower = spec.energy / spec.cooldown; world.colony.demand += b.requestedPower;
    if (state.cooldown > 1e-9) continue;
    if (world.colony.energy + 1e-9 < spec.energy) { b.status = 'no power'; continue; }
    if (world.colony.products.alloy + 1e-9 < spec.alloy || world.colony.products.components + 1e-9 < spec.components) { b.status = 'no feedstock'; continue; }
    if (b.kind !== 'laser' && defence.projectiles.length >= 32) continue;
    const direction = heading(b.angle + state.aim);
    world.colony.energy = Math.max(0, world.colony.energy - spec.energy);
    world.colony.products.alloy = Math.max(0, world.colony.products.alloy - spec.alloy);
    world.colony.products.components = Math.max(0, world.colony.products.components - spec.components);
    b.gridPower = spec.energy / dt; state.cooldown = spec.cooldown; b.status = 'running'; defence.shots++;
    if (b.kind === 'laser') {
      let distance: number = spec.range, victim;
      for (const m of [...defence.meteors, ...world.asteroids]) {
        const hit = rayCircle(at, direction, m.position, m.radius);
        if (hit !== null && hit < distance) { distance = hit; victim = m; }
      }
      const terrain = rayCircle(at, direction, { x: 0, y: 0 }, WORLD.radius);
      if (terrain !== null && terrain < distance) { distance = terrain; victim = undefined; }
      if (victim) victim.health -= spec.damage;
      defence.beams.push({ start: at, end: { x: at.x + direction.x * distance, y: at.y + direction.y * distance }, life: 0.13 });
    } else {
      const targetDistance = target ? Math.hypot(target.position.x - at.x, target.position.y - at.y) : 550;
      defence.projectiles.push({ id: world.nextId++, kind: b.kind, position: at,
        velocity: { x: direction.x * spec.speed, y: direction.y * spec.speed }, targetId: target?.id ?? null,
        life: b.kind === 'missile' ? 20 : 8, fuse: b.kind === 'flak' ? clamp(targetDistance / spec.speed, 0.3, 5) : 20 });
    }
  }
  const remaining: Projectile[] = [];
  for (const p of defence.projectiles) {
    const spec = WEAPONS[p.kind], start = { ...p.position }, acceleration = { x: 0, y: 0 };
    const target = defence.meteors.find(m => m.id === p.targetId && m.health > 0);
    if (p.kind === 'missile' && target) {
      const delta = { x: target.position.x - p.position.x, y: target.position.y - p.position.y }, distance = length(delta);
      if (distance > 0) {
        acceleration.x = clamp((delta.x / distance * spec.speed - p.velocity.x) * 3, -100, 100);
        acceleration.y = clamp((delta.y / distance * spec.speed - p.velocity.y) * 3, -100, 100);
      }
    }
    // Ammunition mass comes from the stock consumed at launch; both variants share a tuned ballistic coefficient.
    const mass = spec.alloy + spec.components;
    p.velocity = integrateVelocity(start, p.velocity, acceleration, mass, mass * 0.00125, dt);
    p.position = { x: start.x + p.velocity.x * dt, y: start.y + p.velocity.y * dt };
    p.life = Math.max(0, p.life - dt); p.fuse = Math.max(0, p.fuse - dt);
    let first: number | null = surfaceHit(start, p.position, WORLD.radius + 1);
    let terrain = first !== null;
    for (const m of defence.meteors) {
      const old = starts.get(m.id) ?? m.position;
      const hit = surfaceHit({ x: start.x - old.x, y: start.y - old.y }, { x: p.position.x - m.position.x, y: p.position.y - m.position.y }, m.radius + 3);
      if (hit !== null && (first === null || hit < first)) { first = hit; terrain = false; }
    }
    if (first !== null) {
      const at = { x: start.x + (p.position.x - start.x) * first, y: start.y + (p.position.y - start.y) * first };
      if (!terrain) blast(world, at, spec.blast, spec.damage);
    } else if (p.fuse === 0 || p.life === 0) blast(world, p.position, spec.blast, spec.damage);
    else remaining.push(p);
  }
  defence.projectiles = remaining;
}
