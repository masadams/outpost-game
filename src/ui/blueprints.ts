import type { BuildType } from '../sim/colonyConfig';

/** Building groups shown as tabs in the build bar when every system is visible. */
export const GROUPS: Array<[string, BuildType[]]> = [
  ['Power & storage', ['solar', 'battery', 'storage']],
  ['Industry & research', ['miningRig', 'refinery', 'fuelProcessor', 'researchLab']],
  ['Crew & service', ['service', 'habitatSmall', 'habitatLarge']],
  ['Defence', ['laser', 'flak', 'missile', 'shieldSmall', 'shieldLarge']],
];
