import { ATMOSPHERE, WORLD } from './config';
import { clamp, length, type Vec } from './math';

// One fixed spherical gravity source; a uniform-density interior keeps acceleration finite at the core.
export function gravity(position: Vec): Vec {
  const denominator = Math.max(length(position), WORLD.minimumRadius) ** 3;
  return { x: -WORLD.mu * position.x / denominator, y: -WORLD.mu * position.y / denominator };
}
export function airDensity(position: Vec): number {
  const altitude = Math.max(0, length(position) - WORLD.radius);
  if (altitude >= ATMOSPHERE.height) return 0;
  const fade = clamp((altitude - ATMOSPHERE.height * 0.75) / (ATMOSPHERE.height * 0.25), 0, 1);
  return ATMOSPHERE.surfaceDensity * Math.exp(-altitude / ATMOSPHERE.scaleHeight) * (1 - fade * fade * (3 - 2 * fade));
}
// Exact quadratic drag decay at the current density: it can remove energy but cannot reverse velocity.
// The atmosphere is at rest in the non-rotating planet's frame. Cd*A is in square metres, mass in kg.
export function applyAirDrag(position: Vec, velocity: Vec, mass: number, dragArea: number, dt: number): Vec {
  const factor = 1 / (1 + airDensity(position) * Math.max(0, dragArea) * length(velocity) * dt / (2 * mass));
  return { x: velocity.x * factor, y: velocity.y * factor };
}
export function integrateVelocity(position: Vec, velocity: Vec, forceAcceleration: Vec, mass: number, dragArea: number, dt: number): Vec {
  const g = gravity(position);
  return applyAirDrag(position, { x: velocity.x + (g.x + forceAcceleration.x) * dt,
    y: velocity.y + (g.y + forceAcceleration.y) * dt }, mass, dragArea, dt);
}
