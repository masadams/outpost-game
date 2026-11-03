import { pursuitAcceleration } from './guidance';
import { terrainHit } from './celestial';
import { firstShieldHit, absorbShield } from './shields';
import { damageFactor } from './shipStats';
import { SHIP_WEAPONS, type CombatProjectile, type Drone } from './combatConfig';
import { integrateVelocity } from './environment';
import { type Vec } from './math';
import { WORLD } from './config';
import { surfaceHit } from './physics';
import { SUIT } from './astronaut';
import { damageColony } from './buildingDamage';
import { lineOfSight } from './weapons';
import type { Asteroid } from './bodies';
import type { WorldState } from './world';

export interface CombatStarts { ship: Vec; enemies: Map<number, Vec>; rocks: Map<number, Vec>; meteors: Map<number, Vec>; suit: Vec }
type Victim = { kind: 'drone'; body: Drone } | { kind: 'rock' | 'meteor'; body: Asteroid } | { kind: 'ship' | 'suit' | 'terrain' };
export function damageShip(world: WorldState, damage: number): void {
  const s = world.ship; s.hull = Math.max(0, s.hull - damage * damageFactor(s)); s.impact = 1;
  if (s.hull === 0) { s.state = 'crashed'; s.thrusting = false; }
}
function missileBlast(world: WorldState, at: Vec, damage: number): void {
  for (const d of world.combat.enemies) if (Math.hypot(d.position.x - at.x, d.position.y - at.y) <= 64 && lineOfSight(at, d.position, world.system)) d.hull = Math.max(0, d.hull - damage);
  for (const b of [...world.asteroids, ...world.defence.meteors, ...world.exploration.sites]) if (Math.hypot(b.position.x - at.x, b.position.y - at.y) <= 55 + b.radius && lineOfSight(at, b.position, world.system)) b.health -= damage / 50;
}
export function stepCombatProjectiles(world: WorldState, dt: number, starts: CombatStarts): void {
  const c = world.combat, remaining: CombatProjectile[] = [];
  for (const p of c.projectiles) {
    const spec = SHIP_WEAPONS[p.kind], damage = p.damage ?? spec.damage;
    let start = { ...p.position };
    const acceleration = { x: 0, y: 0 };
    const target = p.owner === 'ship' && p.kind === 'missile' ? c.enemies.find(d => d.id === p.targetId && d.hull > 0) : null;
    if (target) Object.assign(acceleration, pursuitAcceleration(start, p.velocity, target.position, spec.speed, 80, p.frameVelocity));
    p.velocity = integrateVelocity(start, p.velocity, acceleration, spec.mass, spec.mass * 0.00125, dt, world.system);
    p.position = { x: start.x + p.velocity.x * dt, y: start.y + p.velocity.y * dt }; p.life = Math.max(0, p.life - dt);
    let elapsed = 0, stopped = false;
    for (let sweep = 0; sweep <= world.colony.buildings.length; sweep++) {
      let hit = terrainHit(start, p.position, 1, { ...world.system, time: world.system.time + elapsed * dt }, (1 - elapsed) * dt)?.t ?? null, victim: Victim | null = hit === null ? null : { kind: 'terrain' };
      const test = (position: Vec, previous: Vec, radius: number, candidate: Victim) => {
        const t = surfaceHit({ x: start.x - (previous.x + (position.x - previous.x) * elapsed), y: start.y - (previous.y + (position.y - previous.y) * elapsed) }, { x: p.position.x - position.x, y: p.position.y - position.y }, radius + 1.5);
        if (t !== null && (hit === null || t < hit)) { hit = t; victim = candidate; }
      };
      for (const b of [...world.asteroids, ...world.exploration.sites]) test(b.position, starts.rocks.get(b.id) ?? b.position, b.radius, { kind: 'rock', body: b });
      for (const b of world.defence.meteors) test(b.position, starts.meteors.get(b.id) ?? b.position, b.radius, { kind: 'meteor', body: b });
      if (p.owner === 'ship') {
        for (const d of c.enemies) if (d.hull > 0) test(d.position, starts.enemies.get(d.id) ?? d.position, 9, { kind: 'drone', body: d });
      } else {
        if (world.ship.state !== 'crashed') test(world.ship.position, starts.ship, WORLD.shipRadius, { kind: 'ship' });
        if (world.playerMode === 'astronaut' && world.astronaut.health > 0) test(world.astronaut.position, starts.suit, SUIT.radius, { kind: 'suit' });
      }
      const field = p.owner === 'enemy' ? firstShieldHit(world, start, p.position, 1.5, hit ?? 1, dt, elapsed) : null;
      if (field) {
        const fraction = absorbShield(world, field, 10 * (p.shieldScale ?? 1), p.velocity, spec.mass);
        const at = { x: start.x + (p.position.x - start.x) * field.t, y: start.y + (p.position.y - start.y) * field.t };
        p.shieldScale = (p.shieldScale ?? 1) * fraction;
        if (fraction <= 1e-9) { stopped = true; break; }
        const scale = Math.sqrt(fraction), air = field.velocity ?? { x: 0, y: 0 }, remainingTime = (1 - elapsed) * (1 - field.t) * dt;
        p.velocity = { x: air.x + (p.velocity.x - air.x) * scale, y: air.y + (p.velocity.y - air.y) * scale };
        p.position = { x: at.x + (p.position.x - at.x) * scale + air.x * (1 - scale) * remainingTime, y: at.y + (p.position.y - at.y) * scale + air.y * (1 - scale) * remainingTime };
        start = at; elapsed += (1 - elapsed) * field.t;
        continue;
      }
      if (hit !== null && victim) {
        const at = { x: start.x + (p.position.x - start.x) * hit, y: start.y + (p.position.y - start.y) * hit };
        c.flashes.push({ position: at, life: 0.25 });
        const impacted = victim as Victim;
        if (p.owner === 'ship' && p.kind === 'missile') missileBlast(world, at, damage);
        else if (impacted.kind === 'drone') impacted.body.hull = Math.max(0, impacted.body.hull - damage);
        else if (impacted.kind === 'rock' || impacted.kind === 'meteor') impacted.body.health -= (p.owner === 'enemy' ? 10 * (p.shieldScale ?? 1) : damage) / 50;
        else if (impacted.kind === 'ship') damageShip(world, 10 * (p.shieldScale ?? 1));
        else if (impacted.kind === 'suit') world.astronaut.health = Math.max(0, world.astronaut.health - 15 * (p.shieldScale ?? 1));
        else if (p.owner === 'enemy') damageColony(world, at, 10 * (p.shieldScale ?? 1), 18, 'HOSTILE IMPACT');
        stopped = true;
      }
      break;
    }
    if (!stopped && p.life > 0) remaining.push(p);
  }
  c.projectiles = remaining; c.flashes = c.flashes.slice(-64);
}
