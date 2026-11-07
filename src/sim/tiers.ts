import type { BuildType } from './colonyConfig';
import type { TechId } from './progressionConfig';

/** Tier III of a building also needs the technology of its family, on top of Advanced facility systems. */
export const TIER3_FAMILY: Partial<Record<BuildType, TechId>> = {
  solar: 'reactor',
  battery: 'reactor',
  relay: 'reactor',
  condenser: 'reactor',
  antenna: 'reactor',
  refinery: 'industrial',
  fuelProcessor: 'industrial',
  miningRig: 'industrial',
  droneBay: 'industrial',
  workshop: 'industrial',
  storage: 'lightweight',
  habitatSmall: 'lightweight',
  habitatLarge: 'lightweight',
  laser: 'ballistics',
  flak: 'ballistics',
  missile: 'ballistics',
  shieldSmall: 'composites',
  shieldLarge: 'composites',
  service: 'thermal',
  researchLab: 'autonomy',
  observatory: 'autonomy',
};

/** The technologies a building needs before it can be upgraded to a tier. */
export function tierTechs(kind: BuildType, tier: 2 | 3): TechId[] {
  if (tier === 2) return ['infrastructure'];
  const family = TIER3_FAMILY[kind];
  return family ? ['industrialSystems', family] : ['industrialSystems'];
}
