import { studiedFinds } from './finds';
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
  if (kind === 'relay') return industry;
  if (kind === 'condenser') return industry;
  if (kind === 'workshop') return Object.values(w.outposts).some(o => o.colony.buildings.length > 0);
  if (kind === 'antenna') return [w.colony, ...Object.values(w.outposts).map(o => o.colony)].some(c => c.buildings.some(b => b.kind === 'observatory'));
  if (kind === 'droneBay') return w.colony.research.completed.includes('precision');
  // Shields come after the second storm has been survived; domes once there is a base on another world.
  if (kind === 'shieldSmall') return w.storm.wave > 2 || (w.storm.wave === 2 && w.storm.phase === 'over');
  if (kind === 'shieldLarge') return w.colony.buildings.some(b => b.kind === 'shieldSmall');
  if (kind === 'habitatSmall') return Object.values(w.outposts).some(o => o.colony.buildings.length > 0);
  if (kind === 'habitatLarge') return [w.colony, ...Object.values(w.outposts).map(o => o.colony)].some(c => c.buildings.some(b => b.kind === 'habitatSmall'));
  if (kind === 'researchLab') return studiedFinds(w).length > 0;
  if (kind === 'missile') return w.storm.wave >= 2;
  if (kind === 'laser') {
    return w.colony.buildings.some(b => b.kind === 'observatory') || w.objectives.completed.includes('sky');
  }
  return false;
}
