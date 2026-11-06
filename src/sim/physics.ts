import { type ProductInventory } from './colonyConfig';
import { STATIC_SYSTEM, groundVelocity, nearestPlanet, planetAt, relative, relativeVelocity, surfaceAngle, surfacePosition, terrainHit, type SystemFrame, type BodyId } from './celestial';
import type { UpgradeId } from './progressionConfig';
import { engineStats, damageFactor } from './shipStats';
import { createArmament, type Armament } from './combatConfig';
import { shipMass } from './shipMass';
import { ATMOSPHERE, WORLD } from './config';
import { clamp, dot, heading, length, localAngle, wrap, type Vec } from './math';
import { emptyInventory, type Inventory } from './resources';
import { integrateVelocity } from './environment';
export { gravity } from './environment';

export interface Controls { thrust: boolean; turn: number }
export const IDLE: Controls = { thrust: false, turn: 0 };
export type FlightState = 'landed' | 'flying' | 'crashed';
export interface Ship {
  freight: ProductInventory;
  ground?: BodyId;
  equipment: UpgradeId[];
  towRig: boolean;
  position: Vec; velocity: Vec; angle: number; angularVelocity: number;
  fuel: number; hull: number; state: FlightState; thrusting: boolean;
  /** Speed against the ground at the moment of a crash, for how much of a wreck survives. */
  crashSpeed?: number;
  impact: number; landings: number;
  cargo: Inventory; armament: Armament;
}
export function createShip(): Ship {
  return { freight: { alloy: 0, wire: 0, components: 0, water: 0, oxygen: 0, fuel: 0 }, equipment: [], towRig: false, position: { x: 0, y: -WORLD.radius - WORLD.shipRadius },
    velocity: { x: 0, y: 0 }, angle: 0, angularVelocity: 0,
    fuel: WORLD.fuelCapacity, hull: 100, state: 'landed', thrusting: false, impact: 0, landings: 0, cargo: emptyInventory(), armament: createArmament() };
}
export function telemetry(ship: Pick<Ship, 'position' | 'velocity' | 'angle'>, bodyRadius: number = WORLD.shipRadius, system = STATIC_SYSTEM) {
  const planet = nearestPlanet(ship.position, system), position = relative(ship.position, planet), velocity = relativeVelocity(ship.velocity, planet, ship.position);
  const radius = length(position);
  const normal = radius > 0 ? { x: position.x / radius, y: position.y / radius } : { x: 0, y: -1 };
  return { altitude: Math.max(0, radius - planet.radius - bodyRadius),
    radial: dot(velocity, normal), tangential: dot(velocity, { x: -normal.y, y: normal.x }),
    speed: length(velocity), tilt: Math.abs(wrap(ship.angle - localAngle(position))) };
}
export interface Contact { onPad: boolean; radial: number; tangential: number; tilt: number; spin: number }
export interface LandingLimits { radial: number; tangential: number; tilt: number; spin: number }
/** A prepared pad is forgiving. */
export const PAD_LIMITS: LandingLimits = { radial: WORLD.safeRadialSpeed, tangential: WORLD.safeTangentialSpeed, tilt: WORLD.safeTilt, spin: WORLD.safeAngularSpeed };
/** Anywhere else you can land too, but rough ground needs a gentler touchdown. */
export const GROUND_LIMITS: LandingLimits = { radial: 3.5, tangential: 2, tilt: Math.PI / 18, spin: WORLD.safeAngularSpeed };
export const landingLimits = (onPad: boolean): LandingLimits => (onPad ? PAD_LIMITS : GROUND_LIMITS);
export function safeLanding(contact: Contact): boolean {
  const l = landingLimits(contact.onPad);
  return Math.abs(contact.radial) <= l.radial && Math.abs(contact.tangential) <= l.tangential &&
    Math.abs(contact.tilt) <= l.tilt && Math.abs(contact.spin) <= l.spin;
}
// Earliest segment/circle intersection, including a start already in contact.
export function surfaceHit(start: Vec, end: Vec, radius: number): number | null {
  const d = { x: end.x - start.x, y: end.y - start.y };
  const c = dot(start, start) - radius * radius;
  if (c < -1e-6 || (c <= 1e-6 && dot(start, d) < 0)) return 0;
  const a = dot(d, d);
  const b = 2 * dot(start, d);
  const disc = b * b - 4 * a * c;
  if (a === 0 || disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}
export function stepShip(ship: Ship, input: Controls, dt: number, system: SystemFrame = STATIC_SYSTEM): void {
  ship.impact = Math.max(0, ship.impact - dt);
  ship.thrusting = false;
  if (ship.state === 'crashed') {
    if (ship.ground) {
      const p = planetAt(ship.ground, system), next = planetAt(p.id, { ...system, time: system.time + dt });
      ship.position = surfacePosition(next, surfaceAngle(p, ship.position), WORLD.shipRadius); ship.velocity = groundVelocity(next, ship.position);
      ship.angle = wrap(ship.angle + next.spin - p.spin);
    } else {
      ship.velocity = integrateVelocity(ship.position, ship.velocity, { x: 0, y: 0 }, shipMass(ship), ATMOSPHERE.shipDragArea, dt, system);
      const end = { x: ship.position.x + ship.velocity.x * dt, y: ship.position.y + ship.velocity.y * dt }, hit = terrainHit(ship.position, end, WORLD.shipRadius, system, dt);
      if (hit) { ship.position = surfacePosition(hit.planet, hit.angle, WORLD.shipRadius); ship.velocity = groundVelocity(hit.planet, ship.position); ship.ground = hit.planet.id; } else ship.position = end;
    }
    return;
  }
  if (ship.state === 'landed') {
    const p = planetAt(ship.ground ?? nearestPlanet(ship.position, system).id, system), next = planetAt(p.id, { ...system, time: system.time + dt });
    ship.ground = p.id;
    if (!input.thrust || ship.fuel <= 0) {
      // A landed ship turns with the ground under it.
      ship.position = surfacePosition(next, surfaceAngle(p, ship.position), WORLD.shipRadius); ship.velocity = groundVelocity(next, ship.position);
      ship.angle = wrap(ship.angle + next.spin - p.spin);
      return;
    }
    ship.velocity = groundVelocity(p, ship.position); ship.ground = undefined;
    ship.state = 'flying';
  }
  ship.angularVelocity += Math.max(-1, Math.min(1, input.turn)) * WORLD.angularAcceleration * dt;
  ship.angularVelocity *= Math.exp(-WORLD.angularDamping * dt);
  ship.angularVelocity = clamp(ship.angularVelocity, -WORLD.maxAngularSpeed, WORLD.maxAngularSpeed);
  ship.angle = wrap(ship.angle + ship.angularVelocity * dt);
  const acceleration = { x: 0, y: 0 };
  let mass = shipMass(ship);
  const engine = engineStats(ship);
  if (input.thrust && ship.fuel > 0) {
    const consumed = Math.min(ship.fuel, engine.burn * dt);
    const force = engine.thrust * consumed / (engine.burn * dt);
    const direction = heading(ship.angle);
    mass -= consumed / 2;
    acceleration.x += direction.x * force / mass;
    acceleration.y += direction.y * force / mass;
    ship.fuel -= consumed;
    ship.thrusting = true;
  }
  ship.velocity = integrateVelocity(ship.position, ship.velocity, acceleration, mass, ATMOSPHERE.shipDragArea, dt, system);
  const end = { x: ship.position.x + ship.velocity.x * dt, y: ship.position.y + ship.velocity.y * dt };
  const hit = terrainHit(ship.position, end, WORLD.shipRadius, system, dt);
  if (!hit) { ship.position = end; return; }
  const { planet, angle, normal } = hit;
  ship.position = surfacePosition(planet, angle, WORLD.shipRadius);
  const data = telemetry(ship, WORLD.shipRadius, { ...system, time: system.time + dt });
  const contact = { onPad: Math.abs(wrap(angle - WORLD.padAngle)) * planet.radius <= WORLD.padHalfWidth - WORLD.shipRadius,
    radial: data.radial, tangential: data.tangential, tilt: data.tilt, spin: ship.angularVelocity };
  if (safeLanding(contact)) {
    ship.state = 'landed'; ship.ground = planet.id; ship.velocity = groundVelocity(planet, ship.position); ship.angularVelocity = 0;
    ship.angle = wrap(angle + planet.spin); ship.landings++; ship.thrusting = false;
    return;
  }
  const damage = Math.max(12, data.speed * 2.5 + data.tilt * 25);
  ship.hull = Math.max(0, ship.hull - damage * damageFactor(ship));
  ship.impact = 1;
  if (ship.hull <= 0 || data.speed > 28 || data.tilt > Math.PI / 3) {
    ship.hull = 0; ship.state = 'crashed'; ship.ground = planet.id; ship.thrusting = false; ship.crashSpeed = data.speed; ship.velocity = groundVelocity(planet, ship.position);
  } else {
    // Inelastic ground response; air drag is handled separately by the shared integrator.
    const ground = groundVelocity(planet, ship.position);
    ship.velocity.x = ground.x + (ship.velocity.x - ground.x) * 0.6 - normal.x * data.radial * 0.85;
    ship.velocity.y = ground.y + (ship.velocity.y - ground.y) * 0.6 - normal.y * data.radial * 0.85;
    ship.position.x += normal.x * 0.05; ship.position.y += normal.y * 0.05;
  }
}
