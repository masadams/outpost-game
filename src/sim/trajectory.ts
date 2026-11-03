import { STATIC_SYSTEM } from './celestial';
import { STEP } from './config';
import { IDLE, stepShip, type Ship } from './physics';
import type { Vec } from './math';

export interface Trajectory {
  points: Vec[]; seconds: number;
  contact: null | { position: Vec; seconds: number; safe: boolean };
}
// Reuses the exact live ship integrator with controls released. Does not simulate traffic or tools.
export function predictCoast(ship: Ship, maxSeconds = 180, system = STATIC_SYSTEM): Trajectory {
  const result: Trajectory = { points: [], seconds: 0, contact: null };
  if (ship.state !== 'flying') return result;
  const predicted: Ship = { ...ship, position: { ...ship.position }, velocity: { ...ship.velocity }, cargo: { ...ship.cargo }, armament: { ...ship.armament }, impact: 0 };
  result.points.push({ ...predicted.position });
  const steps = Math.ceil(Math.min(240, Math.max(0, maxSeconds)) / STEP);
  for (let i = 1; i <= steps; i++) {
    stepShip(predicted, IDLE, STEP, { ...system, time: system.time + (i - 1) * STEP }); result.seconds = i * STEP;
    if (i % 20 === 0 || i === steps) result.points.push({ ...predicted.position });
    if (predicted.state !== 'flying' || predicted.impact > 0) {
      result.contact = { position: { ...predicted.position }, seconds: result.seconds, safe: predicted.state === 'landed' };
      result.points.push({ ...predicted.position }); break;
    }
  }
  return result;
}
