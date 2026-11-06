import { moveBody, type Body } from './bodies';
import type { BeltId } from './explorationConfig';
import { BELT_IDS, BELTS } from './explorationConfig';
import { destination } from './exploration';
import { freightError } from './freight';
import { gravity } from './environment';
import { availableProduct } from './colonyPolicy';
import { PRODUCTS, type ProductInventory } from './colonyConfig';
import { WORLD } from './config';
import { rayCircle } from './mining';
import { length, type Vec } from './math';
import { notify } from './messages';
import type { WorldState } from './world';

/** A finite survey probe: a small rocket that homes on a belt, reads it and sends the data home. */
export interface Probe extends Body {
  target: BeltId;
  /** Seconds since launch. */
  age: number;
  /** Speed change left in its tank, m/s. */
  dv: number;
}

/** Belts a probe's tank can reach. The far rim needs a ship. */
export const PROBE_BELTS: readonly BeltId[] = ['frost', 'copper'];

export const PROBE = {
  cost: { alloy: 4, wire: 3, components: 3 } satisfies Partial<ProductInventory>,
  /** m/s² of push while it has propellant. */
  thrust: 9,
  dv: 450,
  /** Distance to the belt (m) at which it can read it. */
  range: 450,
  /** Seconds before an unfinished probe is given up as lost. */
  life: 600,
  /** Probes in flight at once. */
  max: 2,
} as const;

/** Why a probe cannot be launched now, or null. */
export function probeError(w: WorldState): string | null {
  const target = w.exploration.selected;
  if (!(BELT_IDS as readonly string[]).includes(target)) return 'Pick a belt on the Map to survey.';
  if (w.exploration.surveyed.includes(target as BeltId)) return 'Already surveyed.';
  if (!PROBE_BELTS.includes(target as BeltId)) return 'Too far for a probe. Fly there.';
  if (w.exploration.probes.length >= PROBE.max) return 'Both probes are still out.';
  const pad = freightError(w);
  if (pad) return 'Launch from the landed ship on the home pad.';
  const short = PRODUCTS.filter(p => availableProduct(w.colony, p) + 1e-9 < (PROBE.cost[p as keyof typeof PROBE.cost] ?? 0));
  if (short.length) {
    const need = short.map(p => `${Math.ceil((PROBE.cost[p as keyof typeof PROBE.cost] ?? 0) - availableProduct(w.colony, p))} more ${p}`);
    return `Needs ${need.join(', ')}.`;
  }
  return null;
}

export function launchProbe(w: WorldState): void {
  const error = probeError(w);
  if (error) {
    notify(w, error);
    return;
  }
  const belt = w.exploration.selected as BeltId;
  for (const p of PRODUCTS) w.colony.products[p] -= PROBE.cost[p as keyof typeof PROBE.cost] ?? 0;
  w.exploration.probes.push({
    id: w.nextId++, position: { ...w.ship.position }, velocity: { ...w.ship.velocity },
    mass: 30, radius: 1.5, resource: 'iron', target: belt, age: 0, dv: PROBE.dv,
  });
  notify(w, `PROBE LAUNCHED · ${BELTS[belt].label.toUpperCase()}`);
}

/** Flies every probe one step: homing push while it has propellant, gravity and drag always. */
export function stepProbes(w: WorldState, dt: number): void {
  const ex = w.exploration;
  if (ex.probes.length === 0) return;
  const keep: Probe[] = [];
  for (const probe of ex.probes) {
    probe.age += dt;
    const target = destination(w, probe.target).position;
    const to = { x: target.x - probe.position.x, y: target.y - probe.position.y };
    const distance = length(to);
    if (distance <= PROBE.range) {
      if (!ex.surveyed.includes(probe.target)) ex.surveyed.push(probe.target);
      notify(w, `PROBE DATA · ${BELTS[probe.target].label.toUpperCase()} SURVEYED`);
      continue;
    }
    if (probe.dv > 0 && distance > 1e-6) {
      // Steer to close on the belt at a modest speed, braking as it nears; cancel most of gravity so it climbs.
      const g = gravity(probe.position, w.system);
      const gl = length(g) || 1;
      const up = { x: -g.x / gl, y: -g.y / gl };
      const low = Math.max(0, 1 - (probe.age / 25));
      const frame = destination(w, probe.target).velocity;
      const closing = Math.min(80, Math.max(12, distance * 0.12));
      // If the planet is in the way, climb and swing around it instead of aiming straight through.
      const dir = { x: to.x / distance, y: to.y / distance };
      const blocked = rayCircle(probe.position, dir, { x: 0, y: 0 }, WORLD.radius + 150) !== null;
      const side = Math.sign(up.x * dir.y - up.y * dir.x) || 1;
      const around = { x: -up.y * side, y: up.x * side };
      const want = blocked
        ? { x: frame.x + around.x * 35 + up.x * 80, y: frame.y + around.y * 35 + up.y * 80 }
        : {
          x: frame.x + dir.x * closing + up.x * 60 * low,
          y: frame.y + dir.y * closing + up.y * 60 * low,
        };
      let ax = (want.x - probe.velocity.x) * 0.8;
      let ay = (want.y - probe.velocity.y) * 0.8;
      const am = Math.hypot(ax, ay);
      const limit = Math.min(PROBE.thrust, probe.dv / dt);
      if (am > limit) {
        ax = (ax / am) * limit;
        ay = (ay / am) * limit;
      }
      probe.velocity = { x: probe.velocity.x + (ax - g.x * 0.9) * dt, y: probe.velocity.y + (ay - g.y * 0.9) * dt };
      probe.dv -= Math.hypot(ax, ay) * dt;
    }
    const hit = moveBody(probe, dt, w.system);
    if (hit > 0 || probe.age > PROBE.life) {
      notify(w, 'A probe was lost.');
      continue;
    }
    keep.push(probe);
  }
  ex.probes = keep;
}
