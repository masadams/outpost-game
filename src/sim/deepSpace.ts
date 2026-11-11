import { notify } from './messages';
import { streamFor } from './seed';
import { cargoMass } from './shipMass';
import { cargoCapacity } from './shipStats';
import type { Vec } from './math';
import type { ProductInventory } from './colonyConfig';
import type { Resource } from './resources';
import type { WorldState } from './world';

/**
 * Deep space: a handful of things drifting far beyond the worlds, 90 km and more from the middle of the system.
 * Nothing points at them at first. Late in the story the antenna hears faint returns and the Map shows which way
 * they lie; or you find one by flying out. Each one found is a memory, and some carry something to take home.
 * They stay where they are: fixed points in the system, seeded, the same in every load of a game.
 */
export const DEEP_IDS = ['hulk', 'marker', 'comet', 'darkWorld', 'graveyard'] as const;
export type DeepId = typeof DEEP_IDS[number];

export interface DeepFind {
  label: string;
  /** Kilometres from the middle of the system. */
  km: number;
  /** How it looks: drawn by the renderer. */
  look: 'hulk' | 'marker' | 'comet' | 'dark' | 'ring';
  /** Size to draw, m. */
  size: number;
  /** What the unit notes on finding it. Kept in the Journal as a memory with the same id. */
  text: string;
  /** Materials it gives up the first time, into the lander's freight, as far as there is room. */
  salvage?: Partial<ProductInventory>;
  /** Ore it gives up the first time, into the hold. */
  ore?: Partial<Record<Resource, number>>;
}

export const DEEP: Record<DeepId, DeepFind> = {
  hulk: {
    label: 'Carrier hulk', km: 95, look: 'hulk', size: 160,
    text: 'A length of Long Patience\'s spine, drifting. Its recorder bay is open and empty. The latches were undone from inside.',
    salvage: { alloy: 30, components: 15 },
  },
  marker: {
    label: 'Makers\' marker', km: 130, look: 'marker', size: 20,
    text: 'A marker the makers left at the edge of the system before any unit came. It counts down to an arrival. The date passed 300 years ago.',
  },
  comet: {
    label: 'Frozen comet', km: 120, look: 'comet', size: 220,
    text: 'A comet core, asleep out here, older than the storms. Its ice is clean enough to drink.',
    ore: { ice: 60 },
  },
  darkWorld: {
    label: 'Dark world', km: 185, look: 'dark', size: 1400,
    text: 'A world with no star, passing through. It is on none of the makers\' charts. Its surface is too smooth to be rock.',
  },
  graveyard: {
    label: 'Lander ring', km: 240, look: 'ring', size: 600,
    text: 'Landers, dozens, parked in a neat ring and powered down. Not from the carrier. Not from anything in the archive.',
  },
};

/** How close (m) the lander must come to find one. */
export const FIND_RANGE = 3000;
/** Within this range (m) of one not yet found, the guide arrow points at it: you have come a long way out. */
export const POINT_RANGE = 30000;

const placeCache = new Map<string, Vec>();
/** Where a find drifts, in system coordinates (m). Seeded; the standard layout uses fixed bearings. */
export function deepPosition(id: DeepId, seed: number): Vec {
  const key = `${id}/${seed}`;
  const known = placeCache.get(key);
  if (known) return known;
  const bearing = seed === 0 ? DEEP_IDS.indexOf(id) * 1.3 : streamFor(seed, `deep/${id}`)() * Math.PI * 2;
  const r = DEEP[id].km * 1000;
  const at = { x: Math.cos(bearing) * r, y: Math.sin(bearing) * r };
  placeCache.set(key, at);
  return at;
}

export const deepFound = (w: WorldState): DeepId[] => ((w.rootWorld ?? w).exploration.deep ?? []) as DeepId[];

/** Whether the Map shows which way the unfound ones lie: once the makers' relay has been found. */
export function deepHeard(source: WorldState): boolean {
  const w = source.rootWorld ?? source;
  return (w.exploration.story?.memories ?? []).includes('makersRelay');
}

/** Finds whatever the lander has come close to, and takes what it carries. */
export function stepDeepSpace(source: WorldState): void {
  const w = source.rootWorld ?? source;
  if (!w.system.sun || w.playerMode !== 'ship' || w.ship.state !== 'flying') return;
  for (const id of DEEP_IDS) {
    if (deepFound(w).includes(id)) continue;
    const at = deepPosition(id, w.seed);
    if (Math.hypot(at.x - w.ship.position.x, at.y - w.ship.position.y) > FIND_RANGE + DEEP[id].size) continue;
    w.exploration.deep = [...deepFound(w), id];
    const took = takeSalvage(w, DEEP[id]);
    notify(w, `FOUND · ${DEEP[id].label.toUpperCase()}${took ? ` · ${took}` : ''} · SEE THE JOURNAL`, 8);
  }
}

function takeSalvage(w: WorldState, find: DeepFind): string {
  const parts: string[] = [];
  let room = Math.max(0, cargoCapacity(w.ship) - cargoMass(w.ship));
  for (const [p, amount] of Object.entries(find.salvage ?? {}) as Array<[keyof ProductInventory, number]>) {
    const take = Math.min(amount, room);
    if (take <= 0) continue;
    w.ship.freight[p] += take;
    room -= take;
    parts.push(`${Math.round(take)} ${p}`);
  }
  for (const [r, amount] of Object.entries(find.ore ?? {}) as Array<[Resource, number]>) {
    const take = Math.min(amount, room);
    if (take <= 0) continue;
    w.ship.cargo[r] += take;
    room -= take;
    parts.push(`${Math.round(take)} kg ${r}`);
  }
  return parts.length ? `TOOK ${parts.join(', ').toUpperCase()}` : '';
}

/** The nearest unfound one within pointing range of the lander, for the guide arrow. */
export function deepPointer(source: WorldState): Vec | null {
  const w = source.rootWorld ?? source;
  if (!w.system.sun || w.playerMode !== 'ship' || w.ship.state !== 'flying') return null;
  let best: Vec | null = null;
  let bestDistance = POINT_RANGE;
  for (const id of DEEP_IDS) {
    if (deepFound(w).includes(id)) continue;
    const at = deepPosition(id, w.seed);
    const d = Math.hypot(at.x - w.ship.position.x, at.y - w.ship.position.y);
    if (d < bestDistance) {
      best = at;
      bestDistance = d;
    }
  }
  return best;
}

export function validDeep(value: unknown): boolean {
  return Array.isArray(value) && value.length <= DEEP_IDS.length && new Set(value).size === value.length
    && value.every(id => (DEEP_IDS as readonly string[]).includes(id));
}
