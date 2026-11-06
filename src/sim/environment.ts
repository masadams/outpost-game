import { groundVelocity, planets, relative, STATIC_SYSTEM, type SystemFrame } from './celestial';
import { ATMOSPHERE, WORLD } from './config';
import { clamp, length, type Vec } from './math';

// Shared binary-source gravity; uniform-density interiors keep acceleration finite at both cores.
export function gravity(position: Vec, system = STATIC_SYSTEM): Vec {
  const result = { x: -0, y: -0 };
  for (const planet of planets(system)) {
    const p = relative(position, planet), denominator = Math.max(length(p), planet.radius) ** 3;
    result.x -= planet.mu * p.x / denominator; result.y -= planet.mu * p.y / denominator;
  }
  return result;
}
export function airDensity(position: Vec, system = STATIC_SYSTEM): number {
  const altitude = Math.max(0, length(relative(position, planets(system)[0])) - WORLD.radius);
  if (altitude >= ATMOSPHERE.height) return 0;
  const fade = clamp((altitude - ATMOSPHERE.height * 0.75) / (ATMOSPHERE.height * 0.25), 0, 1);
  return ATMOSPHERE.surfaceDensity * Math.exp(-altitude / ATMOSPHERE.scaleHeight) * (1 - fade * fade * (3 - 2 * fade));
}
// Exact quadratic drag decay at the current density: it can remove energy but cannot reverse velocity.
// Air moves and turns with the home planet's surface. Cd*A is in square metres, mass in kg.
export function applyAirDrag(position: Vec, velocity: Vec, mass: number, dragArea: number, dt: number, system: SystemFrame = STATIC_SYSTEM): Vec {
  const air = groundVelocity(planets(system)[0], position);
  const v = { x: velocity.x - air.x, y: velocity.y - air.y };
  const factor = 1 / (1 + airDensity(position, system) * Math.max(0, dragArea) * length(v) * dt / (2 * mass));
  return { x: air.x + v.x * factor, y: air.y + v.y * factor };
}
export function integrateVelocity(position: Vec, velocity: Vec, forceAcceleration: Vec, mass: number, dragArea: number, dt: number, system: SystemFrame = STATIC_SYSTEM): Vec {
  const g = gravity(position, system);
  return applyAirDrag(position, { x: velocity.x + (g.x + forceAcceleration.x) * dt,
    y: velocity.y + (g.y + forceAcceleration.y) * dt }, mass, dragArea, dt, system);
}
