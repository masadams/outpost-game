import type { BuildType } from '../sim/colonyConfig';

/** Building groups shown as tabs in the build bar when every system is visible. */
export const GROUPS: Array<[string, BuildType[]]> = [
  ['Power & storage', ['solar', 'geothermal', 'windTurbine', 'battery', 'storage', 'relay']],
  ['Industry & research', ['miningRig', 'droneBay', 'tugBay', 'workerBay', 'condenser', 'antenna', 'workshop', 'massDriver', 'shipyard', 'refinery', 'fuelProcessor', 'researchLab', 'observatory']],
  ['Crew & service', ['service', 'habitatSmall', 'habitatLarge']],
  ['Defence', ['laser', 'flak', 'missile', 'shieldSmall', 'shieldLarge', 'seaWall']],
];
