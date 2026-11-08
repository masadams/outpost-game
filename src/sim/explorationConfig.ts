import { BODY_IDS, type BodyId } from './celestial';
import type { Asteroid } from './bodies';
import type { Inventory, Resource } from './resources';
export const BELT_IDS = ['frost', 'copper', 'rim', 'cinderDebris'] as const;
export type BeltId = typeof BELT_IDS[number];
export const SITE_IDS = ['survey', 'cache', 'tender'] as const;
export type SiteId = typeof SITE_IDS[number];
export type Destination = BodyId | 'mark' | BeltId | SiteId;
export const DESTINATIONS: Destination[] = [...BODY_IDS, 'mark', ...BELT_IDS, ...SITE_IDS];
/** A belt is a short string of rocks in a circular orbit around a body. Add a row to add a belt. */
export interface BeltSpec {
  label: string;
  /** Which body it circles. */
  around: BodyId;
  /** Where along the orbit the middle of the string sits (radians) and its height above the surface (m). */
  angle: number;
  altitude: number;
  /** Gap between neighbouring rocks, in radians of orbit. */
  step: number;
  resources: readonly Resource[];
  color: number;
}
export const BELTS: Record<BeltId, BeltSpec> = {
  frost: { label: 'Frost arc', around: 'home', step: .08, angle: .32, altitude: 1450, resources: ['ice', 'ice', 'ice', 'iron'], color: 0x86e0ff },
  copper: { label: 'Copper shoal', around: 'home', step: .08, angle: -.85, altitude: 1900, resources: ['copper', 'copper', 'iron', 'copper'], color: 0xf5ab79 },
  rim: { label: 'Far rim', around: 'home', step: .08, angle: 1.8, altitude: 2500, resources: ['silicon', 'rareMetals', 'silicon', 'rareMetals'], color: 0xc9b2ef },
  // Debris circling Cinder, low over its surface. Rare metals and silicon: the reason to go there.
  cinderDebris: { label: 'Cinder debris', around: 'cinder', step: .4, angle: 1.1, altitude: 150, resources: ['rareMetals', 'silicon', 'rareMetals', 'iron'], color: 0xe0b48f },
};
export const SITE_INFO: Record<SiteId, { label: string; belt: BeltId; color: number }> = {
  survey: { label: 'Frost survey buoy', belt: 'frost', color: 0x86e0ff },
  cache: { label: 'Copper derelict', belt: 'copper', color: 0xf3d779 },
  tender: { label: 'Far rim fuel tender', belt: 'rim', color: 0x73f3cf },
};
export const EXPLORATION = { range: 120, relativeSpeed: 8, dryMass: 80, rocksPerBelt: 4, siteRadius: 8 } as const;
export interface Site extends Asteroid { key: SiteId; stock: Inventory; fuel: number }
import type { Vec } from './math';
import type { Probe } from './probes';
import type { Pod, PodBeacon } from './pods';
import type { DeepSignal } from './signal';
import type { Expedition } from './expedition';
export interface ExplorationState { selected: Destination; sites: Site[]; surveyed: BeltId[]; salvaged: number; refuelled: number; fuelLost: number; returned: boolean; watch: number; known: BodyId[]; hinted: BodyId[]; crystal: 'lying' | 'carried' | 'studied'; core: 'lying' | 'carried' | 'studied'; probes: Probe[]; pods: Pod[]; /** Where cargo pods came down lately. Missing in older saves. */ beacons?: PodBeacon[]; /** The one-way deep-space beacon, once sent. */ signal?: DeepSignal; /** The expedition to the far system. */ expedition?: Expedition; mark: Vec | null }
export const createExploration = (): ExplorationState => ({ selected: 'home', sites: [], surveyed: [], salvaged: 0, refuelled: 0, fuelLost: 0, returned: false, watch: 0, known: [], hinted: [], crystal: 'lying', core: 'lying', probes: [], pods: [], mark: null });
export type ExplorationAction = { type: 'navigate'; target: Destination } | { type: 'visitSite' } | { type: 'mark'; point: Vec };
export const isExplorationAction = (a: { type: string }): a is ExplorationAction => a.type === 'navigate' || a.type === 'visitSite' || a.type === 'mark';

/** Whether a body is on the Map: home always, the others once the Observatory has surveyed them. */
export const bodyKnown = (e: Pick<ExplorationState, 'known'>, id: BodyId): boolean => id === 'home' || e.known.includes(id);
