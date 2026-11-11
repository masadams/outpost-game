import { relative, surfaceAngle, type BodyId } from './celestial';
import { seamKnown } from './geology';
import { wrap } from './math';
import { notify } from './messages';
import { depositsUnder, seamLine } from './survey';
import type { WorldState } from './world';

/** The lander's ground scan: a pulse that finds every seam within reach along the surface. */
export const PROSPECT = {
  /** Metres along the ground either side of the point below the lander. */
  reach: 1500,
  /** Highest the lander can be above the ground and still scan. */
  height: 1500,
  /** Seconds before the scanner can pulse again. */
  cooldown: 40,
} as const;

export type ProspectAction = { type: 'prospect' };
export const isProspectAction = (a: { type: string }): a is ProspectAction => a.type === 'prospect';

interface ScanState {
  /** Simulation time the scanner is ready again. */
  readyAt: number;
  /** The last pulse, for drawing. */
  pulse: { angle: number; height: number; at: number; body: BodyId } | null;
  count: number;
}

const scans = new WeakMap<WorldState, ScanState>();

function scanState(world: WorldState): ScanState {
  let state = scans.get(world);
  if (!state) {
    state = { readyAt: 0, pulse: null, count: 0 };
    scans.set(world, state);
  }
  return state;
}

const rootOf = (world: WorldState): WorldState => world.rootWorld ?? world;

/** Why the scan cannot run right now, in one short line; null when it can. */
export function prospectBlock(source: WorldState): string | null {
  const world = rootOf(source);
  if (world.playerMode !== 'ship') return 'Board the lander to scan.';
  if (world.ship.state === 'crashed') return 'The lander is wrecked.';
  const found = depositsUnder(world, world.ship.position);
  if (!found) return 'Nothing to scan here.';
  const offset = relative(world.ship.position, found.planet);
  const height = Math.hypot(offset.x, offset.y) - found.planet.radius;
  if (height > PROSPECT.height) return `Fly lower to scan (under ${PROSPECT.height / 1000} km).`;
  const wait = scanState(world).readyAt - world.system.time;
  if (wait > 0) return `Scanner recharging · ${Math.ceil(wait)} s`;
  return null;
}

/** Pulses the scanner. Returns how many new seams it found, or null when it could not run. */
export function prospect(source: WorldState): number | null {
  const world = rootOf(source);
  const block = prospectBlock(world);
  if (block !== null) {
    notify(world, block.toUpperCase(), 3);
    return null;
  }
  const found = depositsUnder(world, world.ship.position)!;
  const { planet, deposits } = found;
  const angle = surfaceAngle(planet, world.ship.position);
  const state = scanState(world);
  state.readyAt = world.system.time + PROSPECT.cooldown;
  const offset = relative(world.ship.position, planet);
  const height = Math.hypot(offset.x, offset.y) - planet.radius;
  state.pulse = { angle, height, at: world.system.time, body: planet.id as BodyId };
  state.count += 1;
  const fresh = deposits.filter(d => {
    if (seamKnown(d)) return false;
    const gap = Math.abs(wrap(angle - d.angle)) * planet.radius - d.halfWidth;
    return gap <= PROSPECT.reach;
  });
  for (const d of fresh) d.surveyed = true;
  if (fresh.length === 0) {
    const left = deposits.filter(d => !seamKnown(d)).length;
    notify(world, left > 0 ? 'SCAN · NO NEW SEAMS NEARBY. TRY ANOTHER STRETCH.' : 'SCAN · EVERY SEAM ON THIS WORLD IS KNOWN', 5);
    return 0;
  }
  const best = [...fresh].sort((a, b) => b.remaining - a.remaining)[0];
  const more = fresh.length > 1 ? ` (+${fresh.length - 1} MORE)` : '';
  notify(world, `SCAN FOUND ${seamLine(best).toUpperCase()}${more}`, 6);
  return fresh.length;
}

/** The latest scan pulse and how many have run, for drawing and sound. */
export function scanPulse(source: WorldState): { pulse: ScanState['pulse']; count: number } {
  const state = scanState(rootOf(source));
  return { pulse: state.pulse, count: state.count };
}

/** What the HUD scan button shows: null to hide it (on foot, or nowhere with hidden seams). */
export function scanButton(source: WorldState): { block: string | null; unknown: number } | null {
  const world = rootOf(source);
  if (world.playerMode !== 'ship') return null;
  const found = depositsUnder(world, world.ship.position);
  if (!found) return null;
  const unknown = found.deposits.filter(d => !seamKnown(d)).length;
  if (unknown === 0) return null;
  return { block: prospectBlock(world), unknown };
}
