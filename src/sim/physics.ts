import { WORLD } from './config';
import { clamp, dot, heading, length, localAngle, wrap, type Vec } from './math';
import { emptyInventory, inventoryMass, type Inventory } from './resources';

export interface Controls { thrust: boolean; turn: number }
export const IDLE: Controls = { thrust: false, turn: 0 };
export type FlightState = 'landed' | 'flying' | 'crashed';
export interface Ship {
  position: Vec; velocity: Vec; angle: number; angularVelocity: number;
  fuel: number; hull: number; state: FlightState; thrusting: boolean;
  impact: number; landings: number;
  cargo: Inventory;
}
export function createShip(): Ship {
  return { position: { x: 0, y: -WORLD.radius - WORLD.shipRadius },
    velocity: { x: 0, y: 0 }, angle: 0, angularVelocity: 0,
    fuel: WORLD.fuelCapacity, hull: 100, state: 'landed', thrusting: false, impact: 0, landings: 0, cargo: emptyInventory() };
}
export function gravity(position: Vec): Vec {
  const denominator = Math.max(length(position), WORLD.minimumRadius) ** 3;
  return { x: -WORLD.mu * position.x / denominator, y: -WORLD.mu * position.y / denominator };
}
export function telemetry(ship: Ship) {
  const radius = length(ship.position);
  const normal = radius > 0 ? { x: ship.position.x / radius, y: ship.position.y / radius } : { x: 0, y: -1 };
  return { altitude: Math.max(0, radius - WORLD.radius - WORLD.shipRadius),
    radial: dot(ship.velocity, normal), tangential: dot(ship.velocity, { x: -normal.y, y: normal.x }),
    speed: length(ship.velocity), tilt: Math.abs(wrap(ship.angle - localAngle(ship.position))) };
}
export interface Contact { onPad: boolean; radial: number; tangential: number; tilt: number; spin: number }
export function safeLanding(contact: Contact): boolean {
  return contact.onPad && Math.abs(contact.radial) <= WORLD.safeRadialSpeed &&
    Math.abs(contact.tangential) <= WORLD.safeTangentialSpeed &&
    Math.abs(contact.tilt) <= WORLD.safeTilt && Math.abs(contact.spin) <= WORLD.safeAngularSpeed;
}
// Earliest segment/circle intersection, including a start already in contact.
export function surfaceHit(start: Vec, end: Vec, radius: number): number | null {
  const d = { x: end.x - start.x, y: end.y - start.y };
  const c = dot(start, start) - radius * radius;
  if (c <= 0 && dot(start, d) < 0) return 0;
  const a = dot(d, d);
  const b = 2 * dot(start, d);
  const disc = b * b - 4 * a * c;
  if (a === 0 || disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}
export function stepShip(ship: Ship, input: Controls, dt: number): void {
  ship.impact = Math.max(0, ship.impact - dt);
  ship.thrusting = false;
  if (ship.state === 'crashed') return;
  if (ship.state === 'landed') {
    if (!input.thrust || ship.fuel <= 0) return;
    ship.state = 'flying';
  }
  ship.angularVelocity += Math.max(-1, Math.min(1, input.turn)) * WORLD.angularAcceleration * dt;
  ship.angularVelocity *= Math.exp(-WORLD.angularDamping * dt);
  ship.angularVelocity = clamp(ship.angularVelocity, -WORLD.maxAngularSpeed, WORLD.maxAngularSpeed);
  ship.angle = wrap(ship.angle + ship.angularVelocity * dt);
  const acceleration = gravity(ship.position);
  if (input.thrust && ship.fuel > 0) {
    const consumed = Math.min(ship.fuel, WORLD.burnRate * dt);
    const force = WORLD.thrust * consumed / (WORLD.burnRate * dt);
    const direction = heading(ship.angle);
    const mass = WORLD.dryMass + ship.fuel + inventoryMass(ship.cargo) - consumed / 2;
    acceleration.x += direction.x * force / mass;
    acceleration.y += direction.y * force / mass;
    ship.fuel -= consumed;
    ship.thrusting = true;
  }
  ship.velocity.x += acceleration.x * dt;
  ship.velocity.y += acceleration.y * dt;
  const end = { x: ship.position.x + ship.velocity.x * dt, y: ship.position.y + ship.velocity.y * dt };
  const contactRadius = WORLD.radius + WORLD.shipRadius;
  const hit = surfaceHit(ship.position, end, contactRadius);
  if (hit === null) { ship.position = end; return; }
  const point = { x: ship.position.x + (end.x - ship.position.x) * hit,
    y: ship.position.y + (end.y - ship.position.y) * hit };
  const angle = localAngle(point);
  const normal = heading(angle);
  ship.position = { x: normal.x * contactRadius, y: normal.y * contactRadius };
  const data = telemetry(ship);
  const contact = { onPad: Math.abs(wrap(angle - WORLD.padAngle)) * WORLD.radius <= WORLD.padHalfWidth - WORLD.shipRadius,
    radial: data.radial, tangential: data.tangential, tilt: data.tilt, spin: ship.angularVelocity };
  if (safeLanding(contact)) {
    ship.state = 'landed'; ship.velocity = { x: 0, y: 0 }; ship.angularVelocity = 0;
    ship.angle = angle; ship.landings++; ship.thrusting = false;
    return;
  }
  const damage = Math.max(12, data.speed * 2.5 + data.tilt * 25);
  ship.hull = Math.max(0, ship.hull - damage);
  ship.impact = 1;
  if (ship.hull <= 0 || data.speed > 28 || data.tilt > Math.PI / 3) {
    ship.hull = 0; ship.state = 'crashed'; ship.thrusting = false; ship.velocity = { x: 0, y: 0 };
  } else {
    // Inelastic rebound; no drag is applied during free flight.
    ship.velocity.x = ship.velocity.x * 0.6 - normal.x * data.radial * 0.85;
    ship.velocity.y = ship.velocity.y * 0.6 - normal.y * data.radial * 0.85;
    ship.position.x += normal.x * 0.05; ship.position.y += normal.y * 0.05;
  }
}
