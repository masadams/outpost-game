import { WORLD } from '../sim/config';
import { SUIT } from '../sim/astronaut';
import { dot, heading, length, localAngle, wrap, type Vec } from '../sim/math';
import type { WorldState } from '../sim/world';

export function migrateSmallMoon(world: WorldState): void {
  const oldRadius = 600;
  const reproject = (position: Vec, velocity: Vec, clearance: number) => {
    const angle = localAngle(position), oldNormal = heading(angle), nextAngle = angle * oldRadius / WORLD.radius;
    const nextNormal = heading(nextAngle), radial = dot(velocity, oldNormal), tangent = dot(velocity, { x: -oldNormal.y, y: oldNormal.x });
    const radius = WORLD.radius + Math.max(clearance, length(position) - oldRadius);
    return { position: { x: nextNormal.x * radius, y: nextNormal.y * radius },
      velocity: { x: nextNormal.x * radial - nextNormal.y * tangent, y: nextNormal.y * radial + nextNormal.x * tangent }, rotation: nextAngle - angle };
  };
  const ship = reproject(world.ship.position, world.ship.velocity, WORLD.shipRadius);
  world.ship.position = ship.position; world.ship.velocity = ship.velocity; world.ship.angle = wrap(world.ship.angle + ship.rotation);
  const suit = reproject(world.astronaut.position, world.astronaut.velocity, SUIT.radius);
  world.astronaut.position = suit.position; world.astronaut.velocity = suit.velocity;
  for (const body of [...world.asteroids, ...world.pickups]) {
    const moved = reproject(body.position, body.velocity, body.radius);
    body.position = moved.position; body.velocity = moved.velocity;
  }
  for (const building of world.colony.buildings) building.angle = wrap(building.angle * oldRadius / WORLD.radius);
}
