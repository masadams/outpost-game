import { BELTS, BELT_IDS } from './explorationConfig';
import type { BeltId } from './explorationConfig';
import { destination } from './exploration';
import { BODY_IDS, planetAt, type BodyId } from './celestial';
import type { Vec } from './math';
import type { WorldState } from './world';

/**
 * Where a belt's centre will be after `seconds`. Belts circle their body on near-circular orbits, so the string of rocks turns
 * about the body at the rate its gravity sets, and the body itself moves on its exact orbit. Real missions aim at this point,
 * not at where the target is now.
 */
export function beltAfter(w: WorldState, belt: BeltId, seconds: number): { position: Vec; velocity: Vec } {
  const spec = BELTS[belt];
  const now = destination(w, belt);
  const bodyNow = planetAt(spec.around, w.system);
  const bodyThen = planetAt(spec.around, { ...w.system, time: w.system.time + seconds });
  const rel = { x: now.position.x - bodyNow.position.x, y: now.position.y - bodyNow.position.y };
  const r = Math.hypot(rel.x, rel.y) || 1;
  const rate = Math.sqrt(bodyNow.mu / r ** 3);
  const turn = rate * seconds;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const rotated = { x: rel.x * cos - rel.y * sin, y: rel.x * sin + rel.y * cos };
  return {
    position: { x: bodyThen.position.x + rotated.x, y: bodyThen.position.y + rotated.y },
    velocity: { x: bodyThen.velocity.x - rate * rotated.y, y: bodyThen.velocity.y + rate * rotated.x },
  };
}

/** The point to aim at to reach a belt from `from` at `speed` m/s: solved by repeating until the arrival time settles. */
export function interceptBelt(w: WorldState, belt: BeltId, from: Vec, speed: number): { position: Vec; seconds: number } {
  let seconds = 0;
  let position = destination(w, belt).position;
  for (let i = 0; i < 6; i++) {
    seconds = Math.hypot(position.x - from.x, position.y - from.y) / Math.max(1, speed);
    position = beltAfter(w, belt, seconds).position;
  }
  return { position, seconds };
}

/** Course to a belt for the player: where to point to reach it, how far, and how long at a given speed. */
export function courseToBelt(w: WorldState, belt: BeltId, speed = 110): { aim: Vec; range: number; seconds: number; bearing: number } {
  const viewer = w.playerMode === 'ship' ? w.ship : w.astronaut;
  const { position, seconds } = interceptBelt(w, belt, viewer.position, speed);
  const dx = position.x - viewer.position.x;
  const dy = position.y - viewer.position.y;
  const heading = Math.atan2(dx, -dy);
  const facing = w.playerMode === 'ship' ? w.ship.angle : 0;
  const bearing = Math.atan2(Math.sin(heading - facing), Math.cos(heading - facing));
  return { aim: position, range: Math.hypot(dx, dy), seconds, bearing };
}

/** The point to aim at to reach a catalogue body from `from` at `speed` m/s: bodies follow exact orbits, so this is exact. */
export function interceptBody(w: WorldState, id: BodyId, from: Vec, speed: number): { position: Vec; seconds: number } {
  let seconds = 0;
  let position = planetAt(id, w.system).position;
  for (let i = 0; i < 8; i++) {
    seconds = Math.hypot(position.x - from.x, position.y - from.y) / Math.max(1, speed);
    position = planetAt(id, { ...w.system, time: w.system.time + seconds }).position;
  }
  return { position, seconds };
}

/** Course to a belt or a world for the player: where to point, how far, how long. Null for other places. */
export function courseTo(w: WorldState, key: string, speed = 110): { aim: Vec; range: number; seconds: number; bearing: number } | null {
  if ((BELT_IDS as readonly string[]).includes(key)) return courseToBelt(w, key as BeltId, speed);
  if (!(BODY_IDS as readonly string[]).includes(key) || key === 'home') return null;
  const viewer = w.playerMode === 'ship' ? w.ship : w.astronaut;
  const { position, seconds } = interceptBody(w, key as BodyId, viewer.position, speed);
  const dx = position.x - viewer.position.x;
  const dy = position.y - viewer.position.y;
  const facing = w.playerMode === 'ship' ? w.ship.angle : 0;
  const heading = Math.atan2(dx, -dy);
  return { aim: position, range: Math.hypot(dx, dy), seconds, bearing: Math.atan2(Math.sin(heading - facing), Math.cos(heading - facing)) };
}
