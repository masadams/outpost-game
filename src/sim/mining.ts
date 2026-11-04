import { cargoMass } from './shipMass';
import { planets, clearTerrain, STATIC_SYSTEM, type SystemFrame } from './celestial';
import { miningStats, tractorStats, cargoCapacity } from './shipStats';
import { shipMass as totalShipMass } from './shipMass';
import { dot, heading, length, type Vec } from './math';
import { type Asteroid, type Pickup } from './bodies';
import { type Ship } from './physics';

export const MINING = { range: 450, damagePerSecond: 1, tractorRange: 260, tractorAcceleration: 35, collectRange: 18 } as const;
export interface Beam { start: Vec; end: Vec; targetId: number | null }
export function rayCircle(origin: Vec, direction: Vec, center: Vec, radius: number): number | null {
  const offset = { x: center.x - origin.x, y: center.y - origin.y };
  const along = dot(offset, direction);
  const perpendicularSquared = dot(offset, offset) - along * along;
  if (perpendicularSquared > radius * radius) return null;
  const half = Math.sqrt(Math.max(0, radius * radius - perpendicularSquared));
  if (along + half < 0) return null;
  return Math.max(0, along - half);
}
export function fireLaser(ship: Ship, asteroids: Asteroid[], dt: number, system: SystemFrame = STATIC_SYSTEM): Beam | null {
  if (ship.state !== 'flying') return null;
  const spec = miningStats(ship);
  if (spec.power > 0) {
    if (ship.armament.overheated || ship.armament.energy + 1e-9 < spec.power * dt) return null;
    ship.armament.energy = Math.max(0, ship.armament.energy - spec.power * dt); ship.armament.heat = Math.min(100, ship.armament.heat + spec.heat * dt);
    if (ship.armament.heat >= 100) ship.armament.overheated = true;
  }
  const direction = heading(ship.angle);
  const start = { x: ship.position.x + direction.x * 10, y: ship.position.y + direction.y * 10 };
  let distance: number = spec.range;
  const moonHit = rayTerrain(start, direction, system);
  if (moonHit !== null) distance = Math.min(distance, moonHit);
  let target: Asteroid | undefined;
  for (const rock of asteroids) {
    const hit = rayCircle(start, direction, rock.position, rock.radius);
    if (hit !== null && hit < distance) { distance = hit; target = rock; }
  }
  if (target) target.health -= MINING.damagePerSecond * spec.rate * dt;
  return { start, end: { x: start.x + direction.x * distance, y: start.y + direction.y * distance }, targetId: target?.id ?? null };
}
export function fracture(rock: Asteroid, nextId: () => number): { rocks: Asteroid[]; ore: Pickup[] } {
  if (rock.stage === 0) {
    const radius = rock.radius / Math.sqrt(2);
    const tangent = heading(rock.id * 2.399963);
    return { rocks: [-1, 1].map(side => ({ ...rock, id: nextId(), stage: 1, radius, mass: rock.mass / 2,
      health: 0.55, maxHealth: 0.55,
      position: { x: rock.position.x + tangent.x * (radius + 0.5) * side, y: rock.position.y + tangent.y * (radius + 0.5) * side },
      velocity: { x: rock.velocity.x + tangent.x * side * 1.5, y: rock.velocity.y + tangent.y * side * 1.5 } })), ore: [] };
  }
  return { rocks: [], ore: Array.from({ length: 4 }, (_, i) => {
    const n = heading(i * Math.PI / 2);
    return { id: nextId(), ...(rock.belt ? { belt: rock.belt } : {}), resource: rock.resource, mass: rock.mass / 4, radius: 2,
      position: { x: rock.position.x + n.x * 4, y: rock.position.y + n.y * 4 },
      velocity: { x: rock.velocity.x + n.x * 2, y: rock.velocity.y + n.y * 2 } };
  }) };
}
export function tractor(ship: Ship, pickup: Pickup, dt: number, system = STATIC_SYSTEM): void {
  if (ship.state !== 'flying' || cargoMass(ship) >= cargoCapacity(ship)) return;
  if (!clearTerrain(ship.position, pickup.position, system)) return;
  const delta = { x: ship.position.x - pickup.position.x, y: ship.position.y - pickup.position.y }, distance = length(delta);
  if (distance > tractorStats(ship).range) return;
  if (distance <= MINING.collectRange) {
    const accepted = Math.min(pickup.mass, cargoCapacity(ship) - cargoMass(ship));
    const mass = totalShipMass(ship);
    ship.velocity.x = (ship.velocity.x * mass + pickup.velocity.x * accepted) / (mass + accepted);
    ship.velocity.y = (ship.velocity.y * mass + pickup.velocity.y * accepted) / (mass + accepted);
    ship.cargo[pickup.resource] += accepted; pickup.mass -= accepted;
    return;
  }
  // Velocity matching is a powered tractor force, never passive ship drag.
  const gain = 1 - Math.exp(-3 * dt);
  const approach = Math.min(45, distance * 2);
  const desired = { x: ship.velocity.x + delta.x / distance * approach, y: ship.velocity.y + delta.y / distance * approach };
  const change = { x: (desired.x - pickup.velocity.x) * gain, y: (desired.y - pickup.velocity.y) * gain };
  const scale = Math.min(1, tractorStats(ship).acceleration * dt / Math.max(length(change), 1e-9));
  pickup.velocity.x += change.x * scale; pickup.velocity.y += change.y * scale;
  const shipMass = totalShipMass(ship);
  ship.velocity.x -= change.x * scale * pickup.mass / shipMass;
  ship.velocity.y -= change.y * scale * pickup.mass / shipMass;
}

/** Charge the field once per fixed step, independently of how many pickups it influences. */
export function powerTractor(ship: Ship, dt: number): boolean {
  const spec = tractorStats(ship);
  if (spec.power === 0) return true;
  if (ship.armament.overheated || ship.armament.energy + 1e-9 < spec.power * dt) return false;
  ship.armament.energy = Math.max(0, ship.armament.energy - spec.power * dt); ship.armament.heat = Math.min(100, ship.armament.heat + spec.heat * dt);
  if (ship.armament.heat >= 100) ship.armament.overheated = true;
  return true;
}

export function rayTerrain(start: Vec, direction: Vec, system = STATIC_SYSTEM): number | null {
  const hits = planets(system).map(p => rayCircle(start, direction, p.position, p.radius)).filter((t): t is number => t !== null);
  return hits.length ? Math.min(...hits) : null;
}
