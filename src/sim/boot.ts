import { industrialPowerBlock } from './colonyPolicy';
import { powerFraction, ratedPower } from './power';
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
export const BOOT_KINDS: readonly BuildType[] = ['observatory', 'refinery', 'fuelProcessor', 'miningRig', 'researchLab'];

export const needsBoot = (kind: BuildType): boolean => BOOT_KINDS.includes(kind);
export const isOnline = (b: Building): boolean => b.boot === undefined || b.boot >= BOOT_SECONDS;

/** Advances a machine's warm-up. Returns true when it is online and should do its normal work this step. */
export function bootStep(world: WorldState, b: Building, dt: number): boolean {
  if (b.boot === undefined) return true;
  const colony = world.colony;
  const rated = ratedPower(b) * powerFraction(b);
  const powered = rated <= 0 || industrialPowerBlock(colony, rated * BOOT_DRAW * dt) === null;
  if (b.boot >= BOOT_SECONDS) {
    b.dark = powered ? 0 : (b.dark ?? 0) + dt;
    if ((b.dark ?? 0) < BROWNOUT_SECONDS) return true;
    b.boot = 0;
    b.dark = 0;
  }
  b.requestedPower = rated * BOOT_DRAW;
  colony.demand += b.requestedPower;
  if (powered) {
    colony.energy = Math.max(0, colony.energy - rated * BOOT_DRAW * dt);
    b.gridPower = rated * BOOT_DRAW;
    b.boot = Math.min(BOOT_SECONDS, b.boot + dt);
    b.status = 'starting';
  } else {
    b.boot = Math.max(0, b.boot - 2 * dt);
    b.status = 'no power';
  }
  return false;
}
