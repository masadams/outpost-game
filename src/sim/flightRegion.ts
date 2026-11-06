import { STATIC_SYSTEM, nearestPlanet, relative } from './celestial';
import type { Vec } from './math';
export type FlightRegion = 'atmosphere' | 'thin-air' | 'space' | 'airless';
/** Uses the same body-centre boundary as atmospheric drag. Gravity remains active in space. */
export function flightRegion(position: Vec, system = STATIC_SYSTEM): FlightRegion {
  const planet = nearestPlanet(position, system), p = relative(position, planet);
  const height = Math.hypot(p.x, p.y) - planet.radius;
  if (!planet.atmosphere) return height < 1000 ? 'airless' : 'space';
  return height >= planet.atmosphere ? 'space' : height >= planet.atmosphere - 200 ? 'thin-air' : 'atmosphere';
}
export const REGION_LABELS: Record<FlightRegion, string> = { airless: 'AIRLESS · VACUUM', atmosphere: 'ATMOSPHERE', 'thin-air': 'THIN AIR', space: 'SPACE · VACUUM' };
