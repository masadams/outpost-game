import { studiedFinds } from './finds';
import type { BuildType } from './colonyConfig';
import { hasMemory } from './story';
import type { WorldState } from './world';

const colonies = (w: WorldState) => [w.colony, ...Object.values(w.outposts).map(o => o.colony)];

/** Blueprints a new player starts with. */
const START: readonly BuildType[] = ['solar', 'refinery'];
/** Remembered one at a time after the first industry runs, each when the base meets the problem it solves. */
const REMEMBERED: readonly BuildType[] = ['battery', 'storage', 'fuelProcessor', 'miningRig', 'relay', 'condenser'];

/**
 * Whether a blueprint has been earned yet. The new-player build menu lists only these, so early play follows the
 * intended order: power and a refinery, then storage and mining, then the Observatory (from the survey buoy), then defence.
 */
export function blueprintRevealed(world: WorldState, kind: BuildType): boolean {
  const w = world.rootWorld ?? world;
  const industry = w.objectives.completed.includes('industry');
  if (START.includes(kind)) return true;
  if (REMEMBERED.includes(kind)) {
    // The standard test layout (no day cycle) has no story: everything comes with the first industry.
    if (!w.system.sun) return industry;
    return hasMemory(w, kind) || colonies(w).some(c => c.buildings.some(b => b.kind === kind));
  }
  if (kind === 'observatory') {
    return industry && (!w.system.sun || w.exploration.surveyed.includes('frost'));
  }
  if (kind === 'geothermal') return w.colony.research.completed.includes('geoscience');
  if (kind === 'windTurbine') return w.colony.research.completed.includes('aeronautics');
  if (kind === 'massDriver') return w.colony.research.completed.includes('massDrivers');
  if (kind === 'shipyard') return hasMemory(w, 'makersRelay');
  if (kind === 'workshop') return Object.values(w.outposts).some(o => o.colony.buildings.length > 0);
  if (kind === 'antenna') return [w.colony, ...Object.values(w.outposts).map(o => o.colony)].some(c => c.buildings.some(b => b.kind === 'observatory'));
  // The tug bay follows the drone bay: once one is working, the next step is the rocks overhead.
  if (kind === 'tugBay') return colonies(w).some(c => c.buildings.some(b => b.kind === 'droneBay'));
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
