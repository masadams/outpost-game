import { industrialPowerBlock } from './colonyPolicy';
import { powerFraction, ratedPower } from './power';
import { energyCapacity } from './colony';
import type { Building } from './colony';
import type { WorldState } from './world';
import type { BuildType } from './colonyConfig';

/**
 * Powered machines do not start the instant there is a trickle of power. A new building, or one that has been without power
 * for a while, needs steady power for a few seconds to come online. At dawn, when there is only a little power and
 * several machines want it, this stops them all flickering on and off: they warm up in turn and stay on.
 * Buildings without a boot state are treated as already online. That includes everything when the day cycle is off
 * (the test worlds), and older saves.
 */
export const BOOT_SECONDS = 8;
/** How long an online machine can go without power before it shuts down and must boot again. */
export const BROWNOUT_SECONDS = 4;
/** Warming up draws this share of the machine's normal power. */
export const BOOT_DRAW = 0.5;
/** After shutting down for lack of power, a machine waits this long before trying to start again. */
export const RESTART_SECONDS = 10;
/** A machine only starts when the store holds twice what booting takes, or is at least this full (small stores). */
export const START_SHARE = 0.6;
/** Gaps shorter than this pause a running machine without showing it as out of power. */
export const HOLD_SECONDS = 1.5;
/** Every machine that works only while it has power. Each warms up, rides out short gaps and waits after a shutdown. */
export const BOOT_KINDS: readonly BuildType[] = [
  'observatory', 'refinery', 'fuelProcessor', 'miningRig', 'researchLab',
  'condenser', 'antenna', 'workshop', 'droneBay', 'massDriver', 'tugBay',
];

export const needsBoot = (kind: BuildType): boolean => BOOT_KINDS.includes(kind);
export const isOnline = (b: Building): boolean => b.boot === undefined || b.boot >= BOOT_SECONDS;

/** Advances a machine's warm-up. Returns true when it is online and should do its normal work this step. */
export function bootStep(world: WorldState, b: Building, dt: number): boolean {
  if (b.boot === undefined) return true;
  const colony = world.colony;
  const rated = ratedPower(b) * powerFraction(b);
  const draw = rated * BOOT_DRAW;
  const powered = rated <= 0 || industrialPowerBlock(colony, draw * dt) === null;
  if (b.boot >= BOOT_SECONDS) {
    // Online: it needs its full power to work this step.
    const running = rated <= 0 || industrialPowerBlock(colony, rated * dt) === null;
    b.dark = running ? 0 : (b.dark ?? 0) + dt;
    if (running) return true;
    if ((b.dark ?? 0) < BROWNOUT_SECONDS) {
      // A short gap only pauses the work; it says so only if the gap lasts.
      if ((b.dark ?? 0) >= HOLD_SECONDS) b.status = 'no power';
      return false;
    }
    // Out of power for too long: shut down and wait before trying again, so machines do not flicker on and off.
    b.boot = 0;
    b.dark = 0;
    b.wait = RESTART_SECONDS;
  }
  b.requestedPower = draw;
  colony.demand += draw;
  if ((b.wait ?? 0) > 0) {
    b.wait = Math.max(0, (b.wait ?? 0) - dt);
    if (b.wait <= 0) b.wait = undefined;
    b.status = 'no power';
    return false;
  }
  // Starting needs power to spare: the store must be well filled (it only fills when generation beats demand).
  // Once started, it carries on while it gets power; losing power part-way stops it and it waits.
  const starting = b.boot > 0;
  const spare = colony.energy >= Math.min(START_SHARE * energyCapacity(colony), 2 * draw * BOOT_SECONDS);
  if (powered && (starting || spare || rated <= 0)) {
    colony.energy = Math.max(0, colony.energy - draw * dt);
    b.gridPower = draw;
    b.boot = Math.min(BOOT_SECONDS, b.boot + dt);
    b.status = 'starting';
  } else {
    if (starting) {
      b.boot = 0;
      b.wait = RESTART_SECONDS;
    }
    b.status = 'no power';
  }
  return false;
}
