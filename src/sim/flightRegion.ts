import { ATMOSPHERE, WORLD } from './config';
import type { Vec } from './math';
export type FlightRegion = 'atmosphere' | 'thin-air' | 'space';
/** Uses the same body-centre boundary as atmospheric drag. Gravity remains active in space. */
export function flightRegion(position: Vec): FlightRegion {
  const height = Math.hypot(position.x, position.y) - WORLD.radius;
  return height >= ATMOSPHERE.height ? 'space' : height >= ATMOSPHERE.height - 200 ? 'thin-air' : 'atmosphere';
}
export const REGION_LABELS: Record<FlightRegion, string> = { atmosphere: 'ATMOSPHERE', 'thin-air': 'THIN AIR', space: 'SPACE · VACUUM' };
