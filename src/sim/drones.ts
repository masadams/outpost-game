import { nearestPlanet, relative, terrainHit } from './celestial';
import { gravity, integrateVelocity } from './environment';
import { clamp, dot, heading, length, localAngle, wrap } from './math';
import { droneMass, type Drone } from './combatConfig';
import { lineOfSight } from './weapons';
import type { WorldState } from './world';

/** Vectoring thrusters supply bounded force; the visible gun/body rotates toward its aim. */
export function stepDrone(world: WorldState, drone: Drone, dt: number): 'live' | 'escaped' | 'grounded' {
  const ship = world.ship, c = world.combat;
  const delta = { x: ship.position.x - drone.position.x, y: ship.position.y - drone.position.y }, distance = length(delta);
  if (drone.state === 'retreat' || ship.state !== 'flying' || world.playerMode !== 'ship' || distance > 2200 || drone.hull <= 12 || drone.fuel <= 0) drone.state = 'retreat';
  else drone.state = distance > 500 ? 'approach' : 'attack';
  drone.retreatTime = drone.state === 'retreat' ? drone.retreatTime + dt : 0;
  if (drone.retreatTime >= 25 || (drone.state === 'retreat' && distance > 1800)) return 'escaped';
  const outward = heading(localAngle(relative(drone.position, nearestPlanet(drone.position, world.system))));
  const desired = drone.state === 'retreat' ? { x: outward.x * 100 - delta.x / Math.max(1, distance) * 50, y: outward.y * 100 - delta.y / Math.max(1, distance) * 50 } :
    { x: ship.velocity.x + delta.x / Math.max(1, distance) * clamp((distance - 300) * 0.8, -65, 65), y: ship.velocity.y + delta.y / Math.max(1, distance) * clamp((distance - 300) * 0.8, -65, 65) };
  const g = gravity(drone.position, world.system), force = { x: (desired.x - drone.velocity.x) * 1.8 - g.x, y: (desired.y - drone.velocity.y) * 1.8 - g.y };
  const mass = droneMass(drone), fuel = Math.min(drone.fuel, 0.2 * dt), available = 4000 / mass * (fuel / (0.2 * dt));
  const scale = Math.min(1, available / Math.max(1e-9, length(force)));
  drone.fuel = Math.max(0, drone.fuel - fuel);
  drone.velocity = integrateVelocity(drone.position, drone.velocity, { x: force.x * scale, y: force.y * scale }, mass, 2, dt, world.system);
  const end = { x: drone.position.x + drone.velocity.x * dt, y: drone.position.y + drone.velocity.y * dt };
  if (terrainHit(drone.position, end, 9, world.system, dt) !== null) return 'grounded';
  drone.position = end; drone.cooldown = Math.max(0, drone.cooldown - dt); drone.energy = Math.min(50, drone.energy + 6 * dt);
  const lead = distance / 240, aim = localAngle({ x: delta.x + (ship.velocity.x - drone.velocity.x) * lead, y: delta.y + (ship.velocity.y - drone.velocity.y) * lead });
  drone.angle = wrap(drone.angle + clamp(wrap(aim - drone.angle), -2.5 * dt, 2.5 * dt));
  const n = heading(drone.angle);
  const aligned = Math.abs(wrap(aim - drone.angle)) < 0.12 && dot(n, delta) > 0;
  if (drone.state !== 'attack' || distance > 600 || !aligned || !lineOfSight(drone.position, ship.position, world.system) || drone.cooldown > 0 || drone.ammo <= 0 || drone.energy < 10) { drone.windup = 0; return 'live'; }
  drone.windup += dt;
  if (drone.windup + 1e-9 >= 0.9 && c.projectiles.length < 96) {
    drone.windup = 0; drone.cooldown = 1.4; drone.ammo--; drone.energy -= 10; c.enemyShots++;
    c.projectiles.push({ id: world.nextId++, owner: 'enemy', kind: 'cannon', position: { x: drone.position.x + n.x * 13, y: drone.position.y + n.y * 13 }, velocity: { x: drone.velocity.x + n.x * 240, y: drone.velocity.y + n.y * 240 }, life: 5, targetId: null });
    const after = droneMass(drone); drone.velocity.x -= n.x * 24 / after; drone.velocity.y -= n.y * 24 / after;
  }
  return 'live';
}
