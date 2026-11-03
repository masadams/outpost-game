import { STATIC_SYSTEM, terrainHit, surfacePosition } from './celestial';
import { collideShip } from './bodies';
import { firstShieldHit, absorbShield } from './shields';
import type { WorldState } from './world';
import { STEP, WORLD } from './config';
import { integrateVelocity } from './environment';
import { surfaceHit } from './physics';
import { length, type Vec } from './math';
import type { Meteor } from './defenceConfig';

export interface ThreatPrediction { id: number; points: Vec[]; impact: Vec | null; seconds: number }
/** Same shared gravity/drag as mineral bodies, with a terminal swept surface impact instead of a bounce. */
export function advanceMeteor(meteor: Meteor, dt: number, world?: WorldState, shipStart?: Vec, system = world?.system ?? STATIC_SYSTEM): Vec | null {
  meteor.velocity = integrateVelocity(meteor.position, meteor.velocity, { x: 0, y: 0 }, meteor.mass, 0.47 * Math.PI * meteor.radius ** 2, dt, system);
  let start = { ...meteor.position };
  let end = { x: meteor.position.x + meteor.velocity.x * dt, y: meteor.position.y + meteor.velocity.y * dt };
  let elapsed = 0;
  if (world) for (let i = 0; i <= world.colony.buildings.length; i++) {
    const terrain = terrainHit(start, end, meteor.radius, { ...system, time: system.time + elapsed * dt }, (1 - elapsed) * dt)?.t ?? null;
    const previous = shipStart ?? world.ship.position;
    const shipAtStart = { x: previous.x + (world.ship.position.x - previous.x) * elapsed, y: previous.y + (world.ship.position.y - previous.y) * elapsed };
    const shipHit = world.ship.state === 'flying' ? surfaceHit({ x: start.x - shipAtStart.x, y: start.y - shipAtStart.y }, { x: end.x - world.ship.position.x, y: end.y - world.ship.position.y }, meteor.radius + WORLD.shipRadius) : null;
    const field = firstShieldHit(world, start, end, meteor.radius, Math.min(terrain ?? 1, shipHit ?? 1), dt, elapsed);
    if (!field) {
      if (shipHit !== null && (terrain === null || shipHit < terrain)) {
        meteor.position = end; collideShip(world.ship, meteor, shipAtStart, start);
        // End this fixed step at the first physical contact, before any farther field or terrain.
        meteor.position = { x: start.x + (end.x - start.x) * shipHit, y: start.y + (end.y - start.y) * shipHit }; return null;
      }
      break;
    }
    const budget = meteorDamage(meteor, field.velocity), fraction = absorbShield(world, field, budget, meteor.velocity, meteor.mass);
    meteor.impactBudget = budget * fraction;
    const at = { x: start.x + (end.x - start.x) * field.t, y: start.y + (end.y - start.y) * field.t };
    if (fraction <= 1e-9) { meteor.health = 0; meteor.position = at; return null; }
    const scale = Math.sqrt(fraction), air = field.velocity ?? { x: 0, y: 0 }, remaining = (1 - elapsed) * (1 - field.t) * dt;
    meteor.velocity = { x: air.x + (meteor.velocity.x - air.x) * scale, y: air.y + (meteor.velocity.y - air.y) * scale };
    end = { x: at.x + (end.x - at.x) * scale + air.x * (1 - scale) * remaining, y: at.y + (end.y - at.y) * scale + air.y * (1 - scale) * remaining }; start = at; elapsed += (1 - elapsed) * field.t;
  }
  const hit = terrainHit(start, end, meteor.radius, { ...system, time: system.time + elapsed * dt }, (1 - elapsed) * dt);
  if (!hit) { meteor.position = end; return null; }
  meteor.position = surfacePosition(hit.planet, hit.angle, meteor.radius);
  return surfacePosition(hit.planet, hit.angle, 0);
}
export function predictMeteor(source: Meteor, horizon = 120, system = STATIC_SYSTEM): ThreatPrediction {
  const meteor = { ...source, position: { ...source.position }, velocity: { ...source.velocity } };
  const result: ThreatPrediction = { id: source.id, points: [{ ...meteor.position }], impact: null, seconds: 0 };
  const count = Math.ceil(Math.min(120, Math.max(0, horizon)) / STEP);
  for (let i = 1; i <= count; i++) {
    result.impact = advanceMeteor(meteor, STEP, undefined, undefined, { ...system, time: system.time + (i - 1) * STEP }); result.seconds = i * STEP;
    if (i % 30 === 0 || result.impact) result.points.push({ ...meteor.position });
    if (result.impact || length(meteor.position) > WORLD.radius + 20000) break;
  }
  return result;
}

export function meteorDamage(m: Meteor, frameVelocity: Vec = { x: 0, y: 0 }): number {
  return m.impactBudget ?? Math.min(180, Math.max(15, m.mass * ((m.velocity.x - frameVelocity.x) ** 2 + (m.velocity.y - frameVelocity.y) ** 2) / 4000));
}
