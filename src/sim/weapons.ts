import { facilityLevel, workFactor } from './facilityStats';
import { pursuitAcceleration } from './guidance';
import { groundVelocity, relative } from './celestial';
import { allColonies, sitePosition, colonyPlanet } from './localWorld';
import { STATIC_SYSTEM, clearTerrain, terrainHit } from './celestial';
import { orderedBuildings } from './power';
import { isTurret, WEAPONS, type Meteor, type Projectile } from './defenceConfig';
import { WORLD } from './config';
import { clamp, heading, length, localAngle, wrap, type Vec } from './math';
import { rayCircle, rayTerrain } from './mining';
import { surfaceHit } from './physics';
import { integrateVelocity } from './environment';
import { operational } from './buildingHealth';
import type { Building } from './colony';
import type { WorldState } from './world';

/** Power a turret on automatic draws just to stay ready, in kilowatts. */
export const AUTO_STANDBY_KW = 0.5;
/** How far, in radians either way, a laser shot can stray from where it was aimed. */
export const LASER_SPREAD = 0.012;
/** A repeatable pseudo-random number from 0 to 1 for a shot, so saved games play out the same. */
export const shotNoise = (shot: number, id: number): number => { const x = Math.sin(shot * 12.9898 + id * 78.233) * 43758.5453; return x - Math.floor(x); };
export function turretState(building: Building) {
  // Turrets defend by themselves from the moment they are built; automatic can be switched off per turret.
  return building.turret ??= { aim: 0, cooldown: 0, automatic: true };
}
export function turretPosition(building: Building, world?: WorldState): Vec {
  if (world) return sitePosition(world, building.angle, 18);
  const n = heading(building.angle); return { x: n.x * (WORLD.radius + 18), y: n.y * (WORLD.radius + 18) };
}
export function lineOfSight(start: Vec, end: Vec, system = STATIC_SYSTEM): boolean {
  return clearTerrain(start, end, system);
}
function targetFor(world: WorldState, b: Building) {
  if (!isTurret(b.kind)) return undefined;
  const at = turretPosition(b, world), range = turretRange(b);
  // A missile turret holds fire on a rock that missiles already in the air will finish, and picks another.
  const covered = (m: Meteor): boolean => {
    if (b.kind !== 'missile') return false;
    const inbound = world.defence.projectiles.filter(p => p.kind === 'missile' && p.targetId === m.id).length;
    return inbound * blastDamage('missile', WEAPONS.missile.damage, m.radius) >= m.health;
  };
  return world.defence.meteors.filter(m => !covered(m) && Math.hypot(m.position.x - at.x, m.position.y - at.y) <= range && lineOfSight(at, m.position, world.system) &&
    Math.abs(wrap(localAngle({ x: m.position.x - at.x, y: m.position.y - at.y }) - b.angle - colonyPlanet(world).spin)) <= 1.4)
    .sort((a, c) => length(relative(a.position, colonyPlanet(world))) - length(relative(c.position, colonyPlanet(world))) || a.id - c.id)[0];
}
/** Upgraded turrets reach farther: +15% at tier II, +30% at tier III. */
export const RANGE_PER_TIER = 0.15;
export const turretRange = (b: Building): number => WEAPONS[b.kind as keyof typeof WEAPONS].range * (1 + RANGE_PER_TIER * (facilityLevel(b) - 1));

/** Missiles carry a penetrating charge: against a big rock they do several times their usual damage. */
export const HEAVY_ROCK = { radius: 20, missileFactor: 3 } as const;
export const blastDamage = (kind: 'flak' | 'missile', damage: number, rockRadius: number): number =>
  kind === 'missile' && rockRadius >= HEAVY_ROCK.radius ? damage * HEAVY_ROCK.missileFactor : damage;
/** How a missile flies: how hard it can turn, how far ahead it aims, and when it goes off. */
export const MISSILE = {
  /** Steering limit, m/s². */
  turn: 160,
  /** The furthest ahead it will aim, in seconds of the rock's travel. */
  maxLead: 8,
  /** Goes off this close to the rock's surface, in metres. */
  fuse: 35,
  /** Also goes off if it starts falling behind within this share of its blast reach. */
  passShare: 0.8,
  /** How far it will look for another rock once its own is gone, in metres. */
  retarget: 900,
} as const;

function nearestMeteor(meteors: Meteor[], from: Vec, reach: number): Meteor | undefined {
  let best: Meteor | undefined;
  let bestDistance = reach;
  for (const m of meteors) {
    if (m.health <= 0) continue;
    const d = Math.hypot(m.position.x - from.x, m.position.y - from.y);
    if (d < bestDistance) {
      best = m;
      bestDistance = d;
    }
  }
  return best;
}

function blast(world: WorldState, at: Vec, radius: number, damage: number, kind: 'flak' | 'missile'): void {
  for (const m of world.defence.meteors) {
    if (Math.hypot(m.position.x - at.x, m.position.y - at.y) > radius + m.radius || !lineOfSight(at, m.position, world.system)) continue;
    m.health -= blastDamage(kind, damage, m.radius);
    m.lastHit = kind;
  }
}
export function stepWeapons(world: WorldState, fire: boolean, turn: number, dt: number, starts: Map<number, Vec>): void {
  const defence = world.defence;
  defence.beams = defence.beams.filter(b => (b.life -= dt) > 0);
  for (const site of allColonies(world)) {
  for (const b of orderedBuildings(site.colony)) {
    if (!isTurret(b.kind)) continue;
    const state = turretState(b), spec = WEAPONS[b.kind], at = turretPosition(b, site);
    state.cooldown = Math.max(0, state.cooldown - dt);
    if (!operational(b) || !b.enabled || b.linked === false) continue;
    const manual = defence.controlled === b.id, target = targetFor(site, b);
    if (manual) state.aim = clamp(state.aim + turn * 1.1 * dt, -1.4, 1.4);
    else if (state.automatic && target) {
      const flight = spec.speed ? Math.min(6, Math.hypot(target.position.x - at.x, target.position.y - at.y) / spec.speed) : 0;
      const frame = groundVelocity(colonyPlanet(site), at);
      const desired = clamp(wrap(localAngle({ x: target.position.x + (target.velocity.x - frame.x) * flight - at.x, y: target.position.y + (target.velocity.y - frame.y) * flight - at.y }) - b.angle - colonyPlanet(site).spin), -1.4, 1.4);
      state.aim += clamp(wrap(desired - state.aim), -1.5 * dt, 1.5 * dt);
      if (Math.abs(desired - state.aim) > 0.06) continue;
    }
    // A turret left on automatic draws a little power just to stay ready, whether or not it is firing.
    if (state.automatic && !manual) { b.requestedPower = Math.max(b.requestedPower ?? 0, AUTO_STANDBY_KW); site.colony.demand += AUTO_STANDBY_KW; site.colony.energy = Math.max(0, site.colony.energy - AUTO_STANDBY_KW * dt); }
    if (!(manual ? fire : state.automatic && target)) continue;
    const cooldown = spec.cooldown / workFactor(b);
    b.requestedPower = spec.energy / cooldown; site.colony.demand += b.requestedPower;
    if (state.cooldown > 1e-9) continue;
    if (site.colony.energy + 1e-9 < spec.energy) { b.status = 'no power'; continue; }
    if (site.colony.products.alloy + 1e-9 < spec.alloy || site.colony.products.components + 1e-9 < spec.components) { b.status = 'no feedstock'; continue; }
    if (b.kind !== 'laser' && defence.projectiles.length >= 32) continue;
    // Lasers are not perfectly true: each shot can stray a little, so small or distant rocks are sometimes missed.
    const stray = b.kind === 'laser' ? (shotNoise(defence.shots, b.id) - 0.5) * 2 * LASER_SPREAD : 0;
    const direction = heading(b.angle + colonyPlanet(site).spin + state.aim + stray);
    site.colony.energy = Math.max(0, site.colony.energy - spec.energy);
    site.colony.products.alloy = Math.max(0, site.colony.products.alloy - spec.alloy);
    site.colony.products.components = Math.max(0, site.colony.products.components - spec.components);
    b.gridPower = spec.energy / dt; state.cooldown = cooldown; b.status = 'running'; defence.shots++;
    if (b.kind === 'laser') {
      let distance: number = turretRange(b), victim;
      for (const m of [...defence.meteors, ...site.asteroids]) {
        const hit = rayCircle(at, direction, m.position, m.radius);
        if (hit !== null && hit < distance) { distance = hit; victim = m; }
      }
      const terrain = rayTerrain(at, direction, site.system);
      if (terrain !== null && terrain < distance) { distance = terrain; victim = undefined; }
      if (victim) {
        victim.health -= spec.damage;
        if (defence.meteors.includes(victim as Meteor)) (victim as Meteor).lastHit = 'laser';
      }
      defence.beams.push({ start: at, end: { x: at.x + direction.x * distance, y: at.y + direction.y * distance }, life: 0.13 });
    } else {
      const targetDistance = target ? Math.hypot(target.position.x - at.x, target.position.y - at.y) : 550;
      const frame = groundVelocity(colonyPlanet(site), at);
      defence.projectiles.push({ id: site.nextId++, kind: b.kind, position: at, frameVelocity: { ...frame },
        velocity: { x: frame.x + direction.x * spec.speed, y: frame.y + direction.y * spec.speed }, targetId: target?.id ?? null,
        life: b.kind === 'missile' ? 20 : 8, fuse: b.kind === 'flak' ? clamp(targetDistance / spec.speed, 0.3, 5) : 20 });
    }
  }
  }
  const remaining: Projectile[] = [];
  for (const p of defence.projectiles) {
    const spec = WEAPONS[p.kind], start = { ...p.position }, acceleration = { x: 0, y: 0 };
    let target = defence.meteors.find(m => m.id === p.targetId && m.health > 0);
    if (p.kind === 'missile' && !target) {
      // Its rock is gone: go for the nearest one still falling within reach.
      target = nearestMeteor(defence.meteors, p.position, MISSILE.retarget);
      p.targetId = target?.id ?? null;
    }
    const before = target ? Math.hypot(target.position.x - p.position.x, target.position.y - p.position.y) : Infinity;
    if (p.kind === 'missile' && target) {
      // Steer for where the rock will be when the missile gets there, not where it is now.
      const lead = Math.min(MISSILE.maxLead, before / spec.speed);
      const aim = { x: target.position.x + target.velocity.x * lead, y: target.position.y + target.velocity.y * lead };
      Object.assign(acceleration, pursuitAcceleration(p.position, p.velocity, aim, spec.speed, MISSILE.turn, p.frameVelocity));
    }
    // Ammunition mass comes from the stock consumed at launch; both variants share a tuned ballistic coefficient.
    const mass = spec.alloy + spec.components;
    p.velocity = integrateVelocity(start, p.velocity, acceleration, mass, mass * 0.00125, dt, world.system);
    p.position = { x: start.x + p.velocity.x * dt, y: start.y + p.velocity.y * dt };
    p.life = Math.max(0, p.life - dt); p.fuse = Math.max(0, p.fuse - dt);
    let first: number | null = terrainHit(start, p.position, 1, world.system, dt)?.t ?? null;
    let terrain = first !== null;
    for (const m of defence.meteors) {
      const old = starts.get(m.id) ?? m.position;
      const hit = surfaceHit({ x: start.x - old.x, y: start.y - old.y }, { x: p.position.x - m.position.x, y: p.position.y - m.position.y }, m.radius + 3);
      if (hit !== null && (first === null || hit < first)) { first = hit; terrain = false; }
    }
    // Proximity fuse: a missile goes off beside its rock, or the moment it starts to fall behind one it has
    // closed with, instead of needing to strike it.
    const after = target ? Math.hypot(target.position.x - p.position.x, target.position.y - p.position.y) : Infinity;
    const near = target ? after - target.radius : Infinity;
    const passing = after > before && near < spec.blast * MISSILE.passShare;
    if (first === null && p.kind === 'missile' && target && (near <= MISSILE.fuse || passing)) {
      blast(world, p.position, spec.blast, spec.damage, p.kind);
      continue;
    }
    if (first !== null) {
      const at = { x: start.x + (p.position.x - start.x) * first, y: start.y + (p.position.y - start.y) * first };
      if (!terrain) blast(world, at, spec.blast, spec.damage, p.kind);
    } else if (p.fuse === 0 || p.life === 0) blast(world, p.position, spec.blast, spec.damage, p.kind);
    else remaining.push(p);
  }
  defence.projectiles = remaining;
}
