import { WORLD } from './config';
import { dot, heading, length, type Vec } from './math';
import { gravity, surfaceHit, type Ship } from './physics';
import { inventoryMass, type Resource } from './resources';

export interface Body { id: number; position: Vec; velocity: Vec; radius: number; mass: number; resource: Resource }
export interface Asteroid extends Body { stage: number; health: number; maxHealth: number }
export interface Pickup extends Body {}

export function moveBody(body: Body, dt: number): void {
  const g = gravity(body.position);
  body.velocity.x += g.x * dt; body.velocity.y += g.y * dt;
  const end = { x: body.position.x + body.velocity.x * dt, y: body.position.y + body.velocity.y * dt };
  const radius = WORLD.radius + body.radius;
  const hit = surfaceHit(body.position, end, radius);
  if (hit === null) { body.position = end; return; }
  const normal = heading(Math.atan2(body.position.x + (end.x - body.position.x) * hit, -(body.position.y + (end.y - body.position.y) * hit)));
  body.position = { x: normal.x * (radius + 0.001), y: normal.y * (radius + 0.001) };
  const inward = dot(body.velocity, normal);
  if (inward < 0) {
    body.velocity.x = body.velocity.x * 0.8 - normal.x * inward * 1.05;
    body.velocity.y = body.velocity.y * 0.8 - normal.y * inward * 1.05;
  }
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
  const mass = WORLD.dryMass + ship.fuel + inventoryMass(ship.cargo);
  const impulse = -(1 + 0.25) * inward / (1 / mass + 1 / rock.mass);
  ship.velocity.x += n.x * impulse / mass; ship.velocity.y += n.y * impulse / mass;
  rock.velocity.x -= n.x * impulse / rock.mass; rock.velocity.y -= n.y * impulse / rock.mass;
  ship.hull = Math.max(0, ship.hull - Math.max(1, (speed - 2) * 3)); ship.impact = 1;
  if (ship.hull <= 0) { ship.state = 'crashed'; ship.thrusting = false; ship.velocity = { x: 0, y: 0 }; }
}
