import type { BuildType } from '../sim/colonyConfig';

/** Building groups shown as tabs in the build bar when every system is visible. */
export const GROUPS: Array<[string, BuildType[]]> = [
  ['Power & storage', ['solar', 'battery', 'storage', 'relay']],
  ['Industry & research', ['miningRig', 'droneBay', 'condenser', 'antenna', 'refinery', 'fuelProcessor', 'researchLab', 'observatory']],
  ['Crew & service', ['service', 'habitatSmall', 'habitatLarge']],
  ['Defence', ['laser', 'flak', 'missile', 'shieldSmall', 'shieldLarge']],
];
