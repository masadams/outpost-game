import { clamp, type Vec } from './math';
/** Cruise in the launcher's inertial frame, so a common velocity boost cannot change steering. */
export function pursuitAcceleration(position: Vec, velocity: Vec, target: Vec, speed: number, limit: number, reference: Vec = { x: 0, y: 0 }): Vec {
  const dx = target.x - position.x, dy = target.y - position.y, distance = Math.hypot(dx, dy);
  if (distance <= 1e-9) return { x: 0, y: 0 };
  return { x: clamp((reference.x + dx / distance * speed - velocity.x) * 3, -limit, limit), y: clamp((reference.y + dy / distance * speed - velocity.y) * 3, -limit, limit) };
}
