import { moveBody, type Body } from './bodies';
import type { BeltId } from './explorationConfig';
import { bodyKnown, BELT_IDS, BELTS, SITE_INFO } from './explorationConfig';
import { destination } from './exploration';
import { beltAfter } from './intercept';
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
  /** A belt, or 'mark' for a point you marked on the Map. */
  target: BeltId | 'mark';
  /** Where a marked-point probe is headed. */
  point?: Vec;
  /** Seconds since launch. */
  age: number;
  /** Speed change left in its tank, m/s. */
  dv: number;
}

export const PROBE = {
  cost: { alloy: 4, wire: 3, components: 3 } satisfies Partial<ProductInventory>,
  /** m/s² of push while it has propellant. */
  thrust: 9,
  dv: 600,
  /** Speed (m/s) it settles at between the two ends of a long trip. */
  cruise: 110,
  /** Distance to the belt (m) at which it can read it. */
  range: 450,
  /** Seconds before an unfinished probe is given up as lost. */
  life: 900,
  /** How far from the home planet's centre a probe can be sent (m). */
  reach: 25000,
  /** Radius (m) a probe scans around where it arrives at a marked point. */
  scan: 700,
  /** Probes in flight at once. */
  max: 2,
} as const;

/** Why a probe cannot be launched now, or null. */
export function probeError(w: WorldState): string | null {
  // A probe sends its data to a ground station: without a working Observatory there is nobody to listen.
  if (w.system.sun && !w.colony.buildings.some(b => b.kind === 'observatory' && b.health !== 0 && b.linked !== false)) {
    return 'Needs a working Observatory to receive its data.';
  }
  const target = w.exploration.selected;
  if (target === 'mark') {
    const at = w.exploration.mark;
    if (!at) return 'Click the chart to mark a point.';
    if (Math.hypot(at.x, at.y) > PROBE.reach) return 'Too far for a probe. Fly there.';
  } else {
    if (!(BELT_IDS as readonly string[]).includes(target)) return 'Pick a belt or mark a point on the Map.';
    if (w.exploration.surveyed.includes(target as BeltId)) return 'Already surveyed.';
    if (!bodyKnown(w.exploration, BELTS[target as BeltId].around)) return 'Pick a belt or mark a point on the Map.';
  }
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
  const belt = w.exploration.selected as BeltId | 'mark';
  const point = belt === 'mark' && w.exploration.mark ? { ...w.exploration.mark } : undefined;
  for (const p of PRODUCTS) w.colony.products[p] -= PROBE.cost[p as keyof typeof PROBE.cost] ?? 0;
  w.exploration.probes.push({
    id: w.nextId++, position: { ...w.ship.position }, velocity: { ...w.ship.velocity },
    mass: 30, radius: 1.5, resource: 'iron', target: belt, ...(point ? { point } : {}), age: 0, dv: PROBE.dv,
  });
  notify(w, `PROBE LAUNCHED · ${belt === 'mark' ? 'MARKED POINT' : BELTS[belt].label.toUpperCase()}`);
}

/** What a probe reads where it stops: any belt, site or moon within its sensor radius becomes known. */
export function scanAround(w: WorldState, at: Vec): string[] {
  const found: string[] = [];
  const near = (p: Vec, extra = 0): boolean => Math.hypot(p.x - at.x, p.y - at.y) <= PROBE.scan + extra;
  for (const belt of BELT_IDS) {
    const rocks = [...w.asteroids, ...w.pickups].filter(r => r.belt === belt && near(r.position, r.radius));
    const site = w.exploration.sites.find(s => SITE_INFO[s.key].belt === belt && near(s.position));
    if (rocks.length === 0 && !site) continue;
    if (!w.exploration.surveyed.includes(belt)) w.exploration.surveyed.push(belt);
    found.push(BELTS[belt].label);
  }
  if (found.length) notify(w, `PROBE SCAN · FOUND ${found.join(', ').toUpperCase()}`);
  else notify(w, 'PROBE SCAN · NOTHING HERE BUT EMPTY SPACE');
  return found;
}

/** Flies every probe one step: homing push while it has propellant, gravity and drag always. */
export function stepProbes(w: WorldState, dt: number): void {
  const ex = w.exploration;
  if (ex.probes.length === 0) return;
  const keep: Probe[] = [];
  for (const probe of ex.probes) {
    probe.age += dt;
    // A belt moves on, so aim where it will be when the probe gets there, not where it is.
    const here = probe.target === 'mark' && probe.point ? { position: probe.point, velocity: { x: 0, y: 0 } } : destination(w, probe.target);
    const togo = Math.hypot(here.position.x - probe.position.x, here.position.y - probe.position.y) / PROBE.cruise;
    const aim = probe.target === 'mark' ? here : beltAfter(w, probe.target, Math.min(togo, 400));
    const target = aim.position;
    const to = { x: target.x - probe.position.x, y: target.y - probe.position.y };
    const distance = length(to);
    if (distance <= (probe.target === 'mark' ? 150 : PROBE.range)) {
      if (probe.target === 'mark') {
        scanAround(w, probe.position);
      } else {
        if (!ex.surveyed.includes(probe.target)) ex.surveyed.push(probe.target);
        notify(w, `PROBE DATA · ${BELTS[probe.target].label.toUpperCase()} SURVEYED`);
      }
      continue;
    }
    if (probe.dv > 0 && distance > 1e-6) {
      // Steer to close on the belt at a modest speed, braking as it nears; cancel most of gravity so it climbs.
      const g = gravity(probe.position, w.system);
      const gl = length(g) || 1;
      const up = { x: -g.x / gl, y: -g.y / gl };
      const low = Math.max(0, 1 - (probe.age / 25));
      const frame = aim.velocity;
      const closing = Math.min(PROBE.cruise, Math.max(12, distance * 0.12));
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
    if (hit > 0 || probe.age > PROBE.life || (probe.dv <= 0 && length(probe.velocity) < 3)) {
      notify(w, probe.dv <= 0 ? 'A probe ran out of propellant.' : 'A probe was lost.');
      continue;
    }
    keep.push(probe);
  }
  ex.probes = keep;
}
