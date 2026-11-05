import { nearestPlanet, surfacePosition } from '../../sim/celestial';
import { WORLD } from '../../sim/config';
import type { Vec } from '../../sim/math';
import { cargoMass } from '../../sim/shipMass';
import { tractorStats } from '../../sim/shipStats';
import type { WorldState } from '../../sim/world';

export type CoachStep = 'launch' | 'aim' | 'cut' | 'pull' | 'return' | 'unload';

export interface CoachKeys {
  thrust: string;
  turn: string;
  fire: string;
  tractor: string;
  unload: string;
}

export const DEFAULT_COACH_KEYS: CoachKeys = { thrust: 'W', turn: 'A / D', fire: 'Space', tractor: 'C', unload: 'E' };

export interface Coaching {
  step: CoachStep;
  /** One short instruction, second person. */
  text: string;
  /** Where to point the player in the world, if anywhere. */
  target: Vec | null;
}

function distance(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * What a new player should do next on the first sortie: lift off, find a rock, cut it,
 * pull the pieces in, fly home, unload. Returns null once the first delivery is made
 * or when the player is not in the ship.
 */
export function coach(w: WorldState, keys: CoachKeys = DEFAULT_COACH_KEYS): Coaching | null {
  const root = w.rootWorld ?? w;
  if (root.unloaded > 0 || w.playerMode !== 'ship' || w.ship.state === 'crashed') return null;
  const ship = w.ship;
  const cargo = cargoMass(ship);
  const planet = nearestPlanet(ship.position, w.system);
  const pad = surfacePosition(planet, WORLD.padAngle, 0);

  if (cargo > 0) {
    if (ship.state === 'landed') return { step: 'unload', text: `Press ${keys.unload} to unload your ore.`, target: null };
    return { step: 'return', text: 'Fly back and land on the green pad.', target: pad };
  }
  if (ship.state === 'landed') return { step: 'launch', text: `Hold ${keys.thrust} to lift off.`, target: null };

  if (w.beam && w.beam.targetId !== null) return { step: 'cut', text: `Keep holding ${keys.fire} to cut the rock apart.`, target: null };

  const range = tractorStats(ship).range;
  const near = w.pickups
    .map(p => ({ p, d: distance(p.position, ship.position) }))
    .filter(v => v.d <= range * 1.5)
    .sort((a, b) => a.d - b.d)[0];
  if (near) return { step: 'pull', text: `Hold ${keys.tractor} near the pieces to pull them in.`, target: near.p.position };

  const rock = w.asteroids
    .map(a => ({ a, d: distance(a.position, ship.position) }))
    .sort((x, y) => x.d - y.d)[0];
  if (rock) {
    return { step: 'aim', text: `Turn with ${keys.turn} to face a rock, then hold ${keys.fire}.`, target: rock.a.position };
  }
  return null;
}
