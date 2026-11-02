import { ATMOSPHERE, WORLD } from './config';
import { clamp, dot, heading, length, localAngle, type Vec } from './math';
import { surfaceHit } from './physics';
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
export function stepAstronaut(suit: Astronaut, input: SuitControls, dt: number): void {
  if (suit.health <= 0) return;
  const oxygenUsed = Math.min(suit.oxygen, dt);
  suit.oxygen -= oxygenUsed;
  suit.health = Math.max(0, suit.health - (dt - oxygenUsed) * 5);
  if (suit.health <= 0) { suit.velocity = { x: 0, y: 0 }; return; }
  const normal = heading(localAngle(suit.position)), tangent = { x: -normal.y, y: normal.x };
  const jump = input.jump && !suit.jumpHeld; suit.jumpHeld = input.jump;
  if (suit.grounded) {
    const current = dot(suit.velocity, tangent), target = clamp(input.move, -1, 1) * SUIT.walkSpeed;
    const speed = current + clamp(target - current, -SUIT.acceleration * dt, SUIT.acceleration * dt);
    if (!jump) {
      // Ground constraint follows the circular surface exactly, rather than integrating through it.
      const angle = localAngle(suit.position) + speed * dt / (WORLD.radius + SUIT.radius);
      const n = heading(angle);
      suit.position = { x: n.x * (WORLD.radius + SUIT.radius), y: n.y * (WORLD.radius + SUIT.radius) };
      suit.velocity = { x: -n.y * speed, y: n.x * speed };
      return;
    }
    suit.velocity = { x: tangent.x * speed + normal.x * SUIT.jumpSpeed, y: tangent.y * speed + normal.y * SUIT.jumpSpeed };
    suit.grounded = false;
  }
  suit.velocity = integrateVelocity(suit.position, suit.velocity, { x: 0, y: 0 }, ATMOSPHERE.suitMass, ATMOSPHERE.suitDragArea, dt);
  const end = { x: suit.position.x + suit.velocity.x * dt, y: suit.position.y + suit.velocity.y * dt };
  const contactRadius = WORLD.radius + SUIT.radius;
  const hit = surfaceHit(suit.position, end, contactRadius);
  if (hit === null) { suit.position = end; return; }
  const contact = { x: suit.position.x + (end.x - suit.position.x) * hit, y: suit.position.y + (end.y - suit.position.y) * hit };
  const n = heading(localAngle(contact)); const impact = Math.max(0, -dot(suit.velocity, n));
  suit.position = { x: n.x * contactRadius, y: n.y * contactRadius };
  const drift = dot(suit.velocity, { x: -n.y, y: n.x });
  suit.velocity = { x: -n.y * drift, y: n.x * drift }; suit.grounded = true;
  suit.health = Math.max(0, suit.health - Math.max(0, impact - SUIT.safeImpact) * 4);
  if (suit.health === 0) suit.velocity = { x: 0, y: 0 };
}

export const suitAltitude = (suit: Astronaut): number => Math.max(0, length(suit.position) - WORLD.radius - SUIT.radius);
