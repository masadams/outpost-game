import type { Asteroid } from './bodies';
import type { Inventory, Resource } from './resources';
export const BELT_IDS = ['frost', 'copper', 'rim'] as const;
export type BeltId = typeof BELT_IDS[number];
export const SITE_IDS = ['survey', 'cache', 'tender'] as const;
export type SiteId = typeof SITE_IDS[number];
export type Destination = 'home' | 'moon' | BeltId | SiteId;
export const DESTINATIONS: Destination[] = ['home', 'moon', ...BELT_IDS, ...SITE_IDS];
export const BELTS: Record<BeltId, { label: string; angle: number; altitude: number; resources: readonly Resource[]; color: number }> = {
  frost: { label: 'Frost arc', angle: .32, altitude: 1450, resources: ['ice', 'ice', 'ice', 'iron'], color: 0x86e0ff },
  copper: { label: 'Copper shoal', angle: -.85, altitude: 1900, resources: ['copper', 'copper', 'iron', 'copper'], color: 0xf5ab79 },
  rim: { label: 'Far rim', angle: 1.8, altitude: 2500, resources: ['silicon', 'rareMetals', 'silicon', 'rareMetals'], color: 0xc9b2ef },
};
export const SITE_INFO: Record<SiteId, { label: string; belt: BeltId; color: number }> = {
  survey: { label: 'Frost survey buoy', belt: 'frost', color: 0x86e0ff },
  cache: { label: 'Copper derelict', belt: 'copper', color: 0xf3d779 },
  tender: { label: 'Far rim fuel tender', belt: 'rim', color: 0x73f3cf },
};
export const EXPLORATION = { range: 120, relativeSpeed: 8, dryMass: 80, rocksPerBelt: 4, siteRadius: 8 } as const;
export interface Site extends Asteroid { key: SiteId; stock: Inventory; fuel: number }
export interface ExplorationState { selected: Destination; sites: Site[]; surveyed: BeltId[]; salvaged: number; refuelled: number; fuelLost: number; returned: boolean }
export const createExploration = (): ExplorationState => ({ selected: 'home', sites: [], surveyed: [], salvaged: 0, refuelled: 0, fuelLost: 0, returned: false });
export type ExplorationAction = { type: 'navigate'; target: Destination } | { type: 'visitSite' };
export const isExplorationAction = (a: { type: string }): a is ExplorationAction => a.type === 'navigate' || a.type === 'visitSite';
