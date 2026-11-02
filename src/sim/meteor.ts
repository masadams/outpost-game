import { STEP, WORLD } from './config';
import { integrateVelocity } from './environment';
import { surfaceHit } from './physics';
import { heading, length, localAngle, type Vec } from './math';
import type { Meteor } from './defenceConfig';

export interface ThreatPrediction { id: number; points: Vec[]; impact: Vec | null; seconds: number }
/** Same shared gravity/drag as mineral bodies, with a terminal swept surface impact instead of a bounce. */
export function advanceMeteor(meteor: Meteor, dt: number): Vec | null {
  meteor.velocity = integrateVelocity(meteor.position, meteor.velocity, { x: 0, y: 0 }, meteor.mass, 0.47 * Math.PI * meteor.radius ** 2, dt);
  const end = { x: meteor.position.x + meteor.velocity.x * dt, y: meteor.position.y + meteor.velocity.y * dt };
  const hit = surfaceHit(meteor.position, end, WORLD.radius + meteor.radius);
  if (hit === null) { meteor.position = end; return null; }
  const contact = { x: meteor.position.x + (end.x - meteor.position.x) * hit, y: meteor.position.y + (end.y - meteor.position.y) * hit };
  const normal = heading(localAngle(contact)); meteor.position = { x: normal.x * (WORLD.radius + meteor.radius), y: normal.y * (WORLD.radius + meteor.radius) };
  return { x: normal.x * WORLD.radius, y: normal.y * WORLD.radius };
}
export function predictMeteor(source: Meteor, horizon = 120): ThreatPrediction {
  const meteor = { ...source, position: { ...source.position }, velocity: { ...source.velocity } };
  const result: ThreatPrediction = { id: source.id, points: [{ ...meteor.position }], impact: null, seconds: 0 };
  const count = Math.ceil(Math.min(120, Math.max(0, horizon)) / STEP);
  for (let i = 1; i <= count; i++) {
    result.impact = advanceMeteor(meteor, STEP); result.seconds = i * STEP;
    if (i % 30 === 0 || result.impact) result.points.push({ ...meteor.position });
    if (result.impact || length(meteor.position) > WORLD.radius + 20000) break;
  }
  return result;
}
