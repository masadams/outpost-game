import { eventSolarFactor } from './events';
import { capacityFactor } from './facilityStats';
import { colonyPlanet } from './localWorld';
import { powerFraction } from './power';
import { solarFactor } from './sun';
import { surfaceAir } from './airMachines';
import type { BuildType } from './colonyConfig';
import type { Building } from './colony';
import type { WorldState } from './world';

/** Geothermal tap: steady power from heat under the ground, day and night, on any world. */
export const GEOTHERMAL = { power: 5 } as const;
/** Wind turbine: power from moving air, so it follows how thick the air is. Selene's air is the reference. */
export const WIND = { power: 6, referenceDensity: 0.08 } as const;
/** Solar panels get this much more from Photovoltaics. */
export const PHOTOVOLTAIC_GAIN = 1.2;

export const isGenerator = (kind: BuildType): boolean => kind === 'solar' || kind === 'geothermal' || kind === 'windTurbine';

/** What one generator makes right now, in kW, before it travels over any relay. */
export function generatorOutput(world: WorldState, b: Building): number {
  const base = capacityFactor(b) * powerFraction(b);
  if (b.kind === 'geothermal') return GEOTHERMAL.power * base;
  if (b.kind === 'windTurbine') return WIND.power * base * Math.min(1.5, surfaceAir(world) / WIND.referenceDensity);
  const gain = world.colony.research.completed.includes('photovoltaics') ? PHOTOVOLTAIC_GAIN : 1;
  return 8 * base * gain * solarFactor(world.system, b.angle, colonyPlanet(world).id) * eventSolarFactor(world);
}
