import { STATIC_SYSTEM, terrainHit, surfacePosition, relativeVelocity, type SystemFrame } from './celestial';
import { damageFactor } from './shipStats';
import { shipMass } from './shipMass';
import { WORLD } from './config';
import { dot, length, type Vec } from './math';
import { surfaceHit, type Ship } from './physics';
import { integrateVelocity } from './environment';
import { type Resource } from './resources';

import type { BeltId } from './explorationConfig';

export interface Body { belt?: BeltId; id: number; position: Vec; velocity: Vec; radius: number; mass: number; resource: Resource }
export interface Asteroid extends Body { stage: number; health: number; maxHealth: number }
export interface Pickup extends Body {}

export function moveBody(body: Body, dt: number, system: SystemFrame = STATIC_SYSTEM): void {
  body.velocity = integrateVelocity(body.position, body.velocity, { x: 0, y: 0 }, body.mass, 0.47 * Math.PI * body.radius ** 2, dt, system);
  const end = { x: body.position.x + body.velocity.x * dt, y: body.position.y + body.velocity.y * dt };
  const hit = terrainHit(body.position, end, body.radius, system, dt);
  if (!hit) { body.position = end; return; }
  body.position = surfacePosition(hit.planet, hit.angle, body.radius + .001);
  const v = relativeVelocity(body.velocity, hit.planet), inward = dot(v, hit.normal);
  if (inward < 0) body.velocity = { x: hit.planet.velocity.x + v.x * .8 - hit.normal.x * inward * 1.05, y: hit.planet.velocity.y + v.y * .8 - hit.normal.y * inward * 1.05 };

}

export function separateBodies(a: Body, b: Body): void {
  const diff = { x: b.position.x - a.position.x, y: b.position.y - a.position.y };
  const distance = length(diff), overlap = a.radius + b.radius - distance;
  if (overlap <= 0) return;
  const n = distance > 1e-9 ? { x: diff.x / distance, y: diff.y / distance } : { x: 1, y: 0 };
  const total = a.mass + b.mass;
  a.position.x -= n.x * overlap * b.mass / total; a.position.y -= n.y * overlap * b.mass / total;
  b.position.x += n.x * overlap * a.mass / total; b.position.y += n.y * overlap * a.mass / total;
  const closing = dot({ x: b.velocity.x - a.velocity.x, y: b.velocity.y - a.velocity.y }, n);
  if (closing >= 0) return;
  const impulse = -(1 + 0.35) * closing / (1 / a.mass + 1 / b.mass);
  a.velocity.x -= impulse * n.x / a.mass; a.velocity.y -= impulse * n.y / a.mass;
  b.velocity.x += impulse * n.x / b.mass; b.velocity.y += impulse * n.y / b.mass;
}

export function collideShip(ship: Ship, rock: Asteroid, startShip: Vec, startRock: Vec): void {
  if (ship.state !== 'flying') return;
  const start = { x: startShip.x - startRock.x, y: startShip.y - startRock.y };
  const end = { x: ship.position.x - rock.position.x, y: ship.position.y - rock.position.y };
  const radius = rock.radius + WORLD.shipRadius;
  const hit = length(start) < radius ? 0 : surfaceHit(start, end, radius);
  if (hit === null) return;
  const point = { x: start.x + (end.x - start.x) * hit, y: start.y + (end.y - start.y) * hit };
  const distance = length(point);
  const n = distance > 1e-9 ? { x: point.x / distance, y: point.y / distance } : { x: 0, y: -1 };
  const relative = { x: ship.velocity.x - rock.velocity.x, y: ship.velocity.y - rock.velocity.y };
  const inward = dot(relative, n);
  if (inward >= 0) return;
  const speed = -inward;
  // Roll back to contact rather than allowing a fast pass through the moving rock.
  ship.position = { x: startRock.x + (rock.position.x - startRock.x) * hit + n.x * (radius + 0.01),
    y: startRock.y + (rock.position.y - startRock.y) * hit + n.y * (radius + 0.01) };
  const mass = shipMass(ship);
  const impulse = -(1 + 0.25) * inward / (1 / mass + 1 / rock.mass);
  ship.velocity.x += n.x * impulse / mass; ship.velocity.y += n.y * impulse / mass;
  rock.velocity.x -= n.x * impulse / rock.mass; rock.velocity.y -= n.y * impulse / rock.mass;
  ship.hull = Math.max(0, ship.hull - Math.max(1, (speed - 2) * 3) * damageFactor(ship)); ship.impact = 1;
  if (ship.hull <= 0) { ship.state = 'crashed'; ship.thrusting = false; }
}
