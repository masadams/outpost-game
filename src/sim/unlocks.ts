import type { BuildType } from './colonyConfig';
import type { WorldState } from './world';

/** Blueprints a new player starts with. */
const START: readonly BuildType[] = ['solar', 'refinery'];
/** Revealed once the first industry runs. */
const AFTER_INDUSTRY: readonly BuildType[] = ['battery', 'storage', 'fuelProcessor', 'miningRig'];

/**
 * Whether a blueprint has been earned yet. The new-player build menu lists only these, so early play follows the
 * intended order: power and a refinery, then storage and mining, then the Observatory (from the survey buoy), then defence.
 */
export function blueprintRevealed(world: WorldState, kind: BuildType): boolean {
  const w = world.rootWorld ?? world;
  const industry = w.objectives.completed.includes('industry');
  if (START.includes(kind)) return true;
  if (AFTER_INDUSTRY.includes(kind)) return industry;
  if (kind === 'observatory') {
    return industry && (!w.system.sun || w.exploration.surveyed.includes('frost'));
  }
  if (kind === 'laser') {
    return w.colony.buildings.some(b => b.kind === 'observatory') || w.objectives.completed.includes('sky');
  }
  return false;
}
