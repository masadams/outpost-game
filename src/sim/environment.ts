import { BODIES, groundVelocity, planets, relative, STATIC_SYSTEM, type Planet, type SystemFrame } from './celestial';
import { starTide } from './starHazard';
import { ATMOSPHERE, WORLD } from './config';
import { clamp, length, type Vec } from './math';

// Shared binary-source gravity; uniform-density interiors keep acceleration finite at both cores.
export function gravity(position: Vec, system = STATIC_SYSTEM): Vec {
  const result = { x: -0, y: -0 };
  for (const planet of planets(system)) {
    const p = relative(position, planet), denominator = Math.max(length(p), planet.radius) ** 3;
    result.x -= planet.mu * p.x / denominator; result.y -= planet.mu * p.y / denominator;
  }
  if (system.sun) {
    const tide = starTide(position, system);
    result.x += tide.x;
    result.y += tide.y;
  }
  return result;
}
/** The body whose air a point is in, or null in vacuum. */
export function airBody(position: Vec, system = STATIC_SYSTEM): Planet | null {
  for (const planet of planets(system)) {
    const air = BODIES[planet.id].air;
    if (!air) continue;
    const altitude = length(relative(position, planet)) - planet.radius;
    if (altitude < planet.atmosphere) return planet;
  }
  return null;
}

/** Air density (kg/m³) at a point: each body's air thins with height and fades out at the top of its atmosphere. */
export function airDensity(position: Vec, system = STATIC_SYSTEM): number {
  const planet = airBody(position, system);
  if (!planet) return 0;
  const air = BODIES[planet.id].air!;
  const altitude = Math.max(0, length(relative(position, planet)) - planet.radius);
  const fade = clamp((altitude - planet.atmosphere * 0.75) / (planet.atmosphere * 0.25), 0, 1);
  return air.surfaceDensity * Math.exp(-altitude / air.scaleHeight) * (1 - fade * fade * (3 - 2 * fade));
}

/** Air at a point as a fraction of sea-level air on its own body: 0 in vacuum, 1 on the ground. */
export function airFraction(position: Vec, system = STATIC_SYSTEM): number {
  const planet = airBody(position, system);
  if (!planet) return 0;
  return airDensity(position, system) / BODIES[planet.id].air!.surfaceDensity;
}
// Exact quadratic drag decay at the current density: it can remove energy but cannot reverse velocity.
// Air moves and turns with the home planet's surface. Cd*A is in square metres, mass in kg.
export function applyAirDrag(position: Vec, velocity: Vec, mass: number, dragArea: number, dt: number, system: SystemFrame = STATIC_SYSTEM): Vec {
  const air = groundVelocity(airBody(position, system) ?? planets(system)[0], position);
  const v = { x: velocity.x - air.x, y: velocity.y - air.y };
  const factor = 1 / (1 + airDensity(position, system) * Math.max(0, dragArea) * length(v) * dt / (2 * mass));
  return { x: air.x + v.x * factor, y: air.y + v.y * factor };
}
export function integrateVelocity(position: Vec, velocity: Vec, forceAcceleration: Vec, mass: number, dragArea: number, dt: number, system: SystemFrame = STATIC_SYSTEM): Vec {
  const g = gravity(position, system);
  return applyAirDrag(position, { x: velocity.x + (g.x + forceAcceleration.x) * dt,
    y: velocity.y + (g.y + forceAcceleration.y) * dt }, mass, dragArea, dt, system);
}
