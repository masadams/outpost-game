import { STATIC_SYSTEM, nearestPlanet, onGroundNow } from './celestial';
import { STEP } from './config';
import { IDLE, stepShip, type Ship } from './physics';
import type { Vec } from './math';

export interface Trajectory {
  points: Vec[]; seconds: number;
  contact: null | { position: Vec; seconds: number; safe: boolean };
}
/**
 * Points are shown on the ground as it is now: when the planet turns, a point reached later is turned back by however
 * far the ground will have turned by then, so the path shows where you will come down on today's map of the surface.
 */
// Reuses the exact live ship integrator with controls released. Does not simulate traffic or tools.
export function predictCoast(ship: Ship, maxSeconds = 180, system = STATIC_SYSTEM): Trajectory {
  const result: Trajectory = { points: [], seconds: 0, contact: null };
  if (ship.state !== 'flying') return result;
  const predicted: Ship = { ...ship, position: { ...ship.position }, velocity: { ...ship.velocity }, cargo: { ...ship.cargo }, armament: { ...ship.armament }, impact: 0 };
  result.points.push({ ...predicted.position });
  const steps = Math.ceil(Math.min(240, Math.max(0, maxSeconds)) / STEP);
  const body = nearestPlanet(ship.position, system).id;
  const onGround = (p: Vec, seconds: number): Vec => onGroundNow(body, system, p, seconds);
  for (let i = 1; i <= steps; i++) {
    stepShip(predicted, IDLE, STEP, { ...system, time: system.time + (i - 1) * STEP }); result.seconds = i * STEP;
    if (i % 20 === 0 || i === steps) result.points.push(onGround(predicted.position, result.seconds));
    if (predicted.state !== 'flying' || predicted.impact > 0) {
      result.contact = { position: onGround(predicted.position, result.seconds), seconds: result.seconds, safe: predicted.state === 'landed' };
      result.points.push(onGround(predicted.position, result.seconds)); break;
    }
  }
  return result;
}
