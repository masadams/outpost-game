import { nearestPlanet, planetAt, surfaceAngle } from '../src/sim/celestial';
import { WORLD } from '../src/sim/config';
import { localAngle, wrap, type Vec } from '../src/sim/math';
import { telemetry } from '../src/sim/physics';
import { cargoMass } from '../src/sim/shipMass';
import { stepWorld, type WorldControls, type WorldState } from '../src/sim/world';

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/**
 * A plain scripted pilot for tests: holds the lander over a ground point at a height, steering only with thrust and turn,
 * the same controls a player has. Positions are on the turning ground, so it works with the day cycle on.
 */
export function hold(w: WorldState, groundAngle: number, height: number, extra: Partial<WorldControls> = {}): WorldControls {
  const ship = w.ship;
  const planet = nearestPlanet(ship.position, w.system);
  const t = telemetry(ship, WORLD.shipRadius, w.system);
  const rel = { x: ship.position.x - planet.position.x, y: ship.position.y - planet.position.y };
  const up = localAngle(rel);
  // Distance along the ground to the point, positive when the point lies ahead along the turning direction.
  const offset = wrap(groundAngle - surfaceAngle(planet, ship.position)) * planet.radius;
  const limit = t.altitude < 15 ? 0.12 : 0.35;
  const lean = clamp(0.004 * offset - 0.09 * t.tangential, -limit, limit);
  const aim = up + lean;
  const turn = clamp(wrap(aim - ship.angle) * 4 - ship.angularVelocity * 1.2, -1, 1);
  // Landing: keep coming down at a gentle, steady rate so it actually touches; otherwise settle on the height.
  const wantRadial = height <= 1 ? clamp(-t.altitude * 0.35, -3, -1.2) : clamp((height - t.altitude) * 0.35, -12, 14);
  const aligned = Math.abs(wrap(aim - ship.angle)) < 0.5;
  return { thrust: aligned && t.radial < wantRadial, turn, ...extra };
}

/** Steps the world with a control function until `done` or the time runs out. Returns the seconds used. */
export function fly(w: WorldState, seconds: number, control: () => WorldControls, done: () => boolean, dt = 1 / 60): number {
  let t = 0;
  while (t < seconds && !done() && w.ship.state !== 'crashed') {
    stepWorld(w, control(), dt);
    t += dt;
  }
  return t;
}

/** The ground angle under a body in the world. */
export const groundUnder = (w: WorldState, p: Vec): number => surfaceAngle(planetAt('home', w.system), p);

/** The whole first sortie: lift off, mine the nearest rock overhead, pull the pieces in, land on the pad and unload. */
export function firstSortie(w: WorldState): { ok: boolean; delivered: number; seconds: number; why: string } {
  let seconds = 0;
  const rock = () => w.asteroids
    .filter(r => Math.hypot(r.position.x - w.ship.position.x, r.position.y - w.ship.position.y) < 900)
    .sort((a, b) => Math.hypot(a.position.x - w.ship.position.x, a.position.y - w.ship.position.y) - Math.hypot(b.position.x - w.ship.position.x, b.position.y - w.ship.position.y))[0];
  const target = rock();
  if (!target) return { ok: false, delivered: 0, seconds, why: 'no rock near the pad' };
  const height = () => {
    const r = rock();
    return r ? Math.max(40, telemetry({ ...r, angle: 0 }, r.radius, w.system).altitude - 60) : 120;
  };
  // Climb under the rock and keep cutting and pulling until the hold has ore and nothing is left close by.
  seconds += fly(w, 240, () => {
    const r = rock();
    return hold(w, r ? groundUnder(w, r.position) : 0, height(), { mine: true, tractor: true });
  }, () => cargoMass(w.ship) > 0 && w.pickups.filter(p => Math.hypot(p.position.x - w.ship.position.x, p.position.y - w.ship.position.y) < 300).length === 0 && seconds > 5);
  if (cargoMass(w.ship) <= 0) return { ok: false, delivered: 0, seconds, why: `no ore after mining (${w.ship.state})` };
  // Go home: over the pad, then down gently.
  seconds += fly(w, 240, () => hold(w, WORLD.padAngle, 60, { tractor: true }), () => Math.abs(wrap(WORLD.padAngle - groundUnder(w, w.ship.position))) * WORLD.radius < 6);
  seconds += fly(w, 240, () => hold(w, WORLD.padAngle, 0), () => w.ship.state === 'landed');
  if (w.ship.state !== 'landed') return { ok: false, delivered: 0, seconds, why: `did not land (${w.ship.state})` };
  const before = w.unloaded;
  stepWorld(w, { thrust: false, turn: 0, unload: true }, 1 / 60);
  stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
  return { ok: w.unloaded > before, delivered: w.unloaded - before, seconds, why: w.unloaded > before ? 'delivered' : 'unload did nothing (not on the pad?)' };
}
