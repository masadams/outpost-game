import { STATIC_SYSTEM, nearestPlanet, planetAt, relative, relativeVelocity, surfaceAngle, groundVelocity, surfacePosition, terrainHit, type SystemFrame } from './celestial';
import { ATMOSPHERE, WORLD } from './config';
import { clamp, dot, heading, length, localAngle, type Vec } from './math';
import { integrateVelocity } from './environment';

export const SUIT = { radius: 2.5, walkSpeed: 12, acceleration: 30, jumpSpeed: 12, oxygen: 180,
  boardingRange: 20, exitOffset: 14, safeImpact: 14 } as const;
export interface Astronaut {
  position: Vec; velocity: Vec; grounded: boolean; oxygen: number; health: number; jumpHeld: boolean;
}
export interface SuitControls { move: number; jump: boolean }
export function createAstronaut(): Astronaut {
  return { position: { x: 0, y: -WORLD.radius - SUIT.radius }, velocity: { x: 0, y: 0 },
    grounded: true, oxygen: SUIT.oxygen, health: 100, jumpHeld: false };
}
export function stepAstronaut(suit: Astronaut, input: SuitControls, dt: number, environmentalAirSeconds = 0, system: SystemFrame = STATIC_SYSTEM): void {
  if (suit.health <= 0) {
    const p = nearestPlanet(suit.position, system), next = planetAt(p.id, { ...system, time: system.time + dt });
    if (suit.grounded) { suit.position = surfacePosition(next, surfaceAngle(p, suit.position), SUIT.radius); suit.velocity = groundVelocity(next, suit.position); }
    else {
      suit.velocity = integrateVelocity(suit.position, suit.velocity, { x: 0, y: 0 }, ATMOSPHERE.suitMass, ATMOSPHERE.suitDragArea, dt, system);
      const end = { x: suit.position.x + suit.velocity.x * dt, y: suit.position.y + suit.velocity.y * dt }, hit = terrainHit(suit.position, end, SUIT.radius, system, dt);
      if (hit) { suit.position = surfacePosition(hit.planet, hit.angle, SUIT.radius); suit.velocity = groundVelocity(hit.planet, suit.position); suit.grounded = true; } else suit.position = end;
    }
    return;
  }
  const suitSeconds = Math.max(0, dt - Math.max(0, Math.min(dt, environmentalAirSeconds)));
  const oxygenUsed = Math.min(suit.oxygen, suitSeconds);
  suit.oxygen -= oxygenUsed;
  suit.health = Math.max(0, suit.health - (suitSeconds - oxygenUsed) * 5);
  if (suit.health <= 0) { suit.velocity = { x: 0, y: 0 }; return; }
  const planet = nearestPlanet(suit.position, system), position = relative(suit.position, planet), velocity = relativeVelocity(suit.velocity, planet, suit.position);
  const next = planetAt(planet.id, { ...system, time: system.time + dt });
  const normal = heading(localAngle(position)), tangent = { x: -normal.y, y: normal.x };
  const jump = input.jump && !suit.jumpHeld; suit.jumpHeld = input.jump;
  if (suit.grounded) {
    const current = dot(velocity, tangent), target = clamp(input.move, -1, 1) * SUIT.walkSpeed;
    const speed = current + clamp(target - current, -SUIT.acceleration * dt, SUIT.acceleration * dt);
    if (!jump) {
      // Ground constraint follows the circular surface exactly, rather than integrating through it.
      const angle = surfaceAngle(planet, suit.position) + speed * dt / (planet.radius + SUIT.radius);
      suit.position = surfacePosition(next, angle, SUIT.radius);
      const n = heading(angle + next.spin), ground = groundVelocity(next, suit.position);
      suit.velocity = { x: ground.x - n.y * speed, y: ground.y + n.x * speed };
      return;
    }
    const ground = groundVelocity(planet, suit.position);
    suit.velocity = { x: ground.x + tangent.x * speed + normal.x * SUIT.jumpSpeed, y: ground.y + tangent.y * speed + normal.y * SUIT.jumpSpeed };
    suit.grounded = false;
  }
  suit.velocity = integrateVelocity(suit.position, suit.velocity, { x: 0, y: 0 }, ATMOSPHERE.suitMass, ATMOSPHERE.suitDragArea, dt, system);
  const end = { x: suit.position.x + suit.velocity.x * dt, y: suit.position.y + suit.velocity.y * dt };
  const hit = terrainHit(suit.position, end, SUIT.radius, system, dt);
  if (!hit) { suit.position = end; return; }
  suit.position = surfacePosition(hit.planet, hit.angle, SUIT.radius);
  const n = hit.normal, v = relativeVelocity(suit.velocity, hit.planet, suit.position), impact = Math.max(0, -dot(v, n));
  const drift = dot(v, { x: -n.y, y: n.x });
  const ground = groundVelocity(hit.planet, suit.position);
  suit.velocity = { x: ground.x - n.y * drift, y: ground.y + n.x * drift }; suit.grounded = true;
  suit.health = Math.max(0, suit.health - Math.max(0, impact - SUIT.safeImpact) * 4);
  if (suit.health === 0) suit.velocity = { x: 0, y: 0 };
}

export const suitAltitude = (suit: Astronaut): number => Math.max(0, length(suit.position) - WORLD.radius - SUIT.radius);
