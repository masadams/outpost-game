import { MOST_BUILDINGS, PRODUCTS, type ProductInventory } from './colonyConfig';
import { availableProduct } from './colonyPolicy';
import { WORLD } from './config';
import { CELESTIAL, type BodyId } from './celestial';
import { notify } from './messages';
import { productCapacity, type Building, type Colony } from './colony';
import type { WorldState } from './world';

/**
 * The Headquarters: the seed unit's own housing, standing beside the home pad from the first moment. Everything
 * else in the base hangs off it: the power grid starts here, and its level sets how big the base can grow.
 */
export const HQ_LEVELS = [1, 2, 3, 4] as const;
export type HqLevel = typeof HQ_LEVELS[number];

export interface HqLevelSpec {
  /** How many buildings the base can hold, the HQ included. */
  buildings: number;
  /** Extra ore (kg), materials (each) and stored power (kJ) the HQ itself holds. */
  ore: number;
  materials: number;
  energy: number;
  /** What it costs to reach this level from the one before. */
  cost: Partial<ProductInventory>;
  /** Stored power used by the upgrade, at once. */
  upgradeEnergy: number;
}

export const HQ: Record<HqLevel, HqLevelSpec> = {
  1: { buildings: 48, ore: 0, materials: 0, energy: 0, cost: {}, upgradeEnergy: 0 },
  2: { buildings: 72, ore: 200, materials: 60, energy: 200, cost: { alloy: 60, wire: 30, components: 20 }, upgradeEnergy: 100 },
  3: { buildings: 100, ore: 450, materials: 140, energy: 500, cost: { alloy: 150, wire: 70, components: 50 }, upgradeEnergy: 250 },
  4: { buildings: MOST_BUILDINGS, ore: 800, materials: 250, energy: 1000, cost: { alloy: 260, wire: 120, components: 90 }, upgradeEnergy: 500 },
};

/**
 * The outpost core: the same idea on another world, smaller. It arrives with the first building there and sets that
 * base's limit and adds a little storage.
 */
export const CORE: Record<HqLevel, HqLevelSpec> = {
  1: { buildings: 24, ore: 0, materials: 0, energy: 0, cost: {}, upgradeEnergy: 0 },
  2: { buildings: 36, ore: 150, materials: 40, energy: 150, cost: { alloy: 35, wire: 18, components: 10 }, upgradeEnergy: 80 },
  3: { buildings: 50, ore: 300, materials: 90, energy: 350, cost: { alloy: 80, wire: 40, components: 28 }, upgradeEnergy: 180 },
  4: { buildings: 70, ore: 500, materials: 160, energy: 700, cost: { alloy: 150, wire: 70, components: 55 }, upgradeEnergy: 350 },
};

/** The level table for this base's centre: the Headquarters at home, a core elsewhere. */
export const levelsFor = (colony: Colony): Record<HqLevel, HqLevelSpec> => (headquarters(colony)?.core ? CORE : HQ);
/** "Headquarters" or "Outpost core". */
export const centreName = (colony: Colony): string => (headquarters(colony)?.core ? 'Outpost core' : 'Headquarters');

/** The most buildings any base can ever hold: the top HQ level. Saves are checked against it. */
export { MOST_BUILDINGS };

/**
 * Metres west of the pad where the HQ stands: on the suit service terminal, which it takes over. The ground there
 * was already kept clear, so the HQ takes no building room from the player.
 */
export const HQ_METRES = -54;
export const hqAngle = (radius: number = WORLD.radius): number => HQ_METRES / radius;

export const isHq = (b: Pick<Building, 'kind'>): boolean => b.kind === 'headquarters';
export const headquarters = (colony: Colony): Building | undefined => colony.buildings.find(isHq);

/** The HQ's level, 1 to 4; a base without one counts as level 1. */
export function hqLevel(colony: Colony): HqLevel {
  const level = headquarters(colony)?.hqLevel ?? 1;
  return (HQ_LEVELS.includes(level as HqLevel) ? level : 1) as HqLevel;
}

/** How many buildings this base can hold right now. */
export const buildingLimit = (colony: Colony): number => levelsFor(colony)[hqLevel(colony)].buildings;

/** What the HQ adds to the base's stores at its level. Nothing at level 1, so a new base is as it always was. */
export function hqStorage(colony: Colony): { ore: number; materials: number; energy: number } {
  const hq = headquarters(colony);
  if (!hq || (hq.health !== undefined && hq.health <= 0)) return { ore: 0, materials: 0, energy: 0 };
  const spec = levelsFor(colony)[hqLevel(colony)];
  return { ore: spec.ore, materials: spec.materials, energy: spec.energy };
}

/** A new HQ building, at level 1. */
export function newHq(id: number, radius: number = WORLD.radius): Building {
  return { id, kind: 'headquarters', angle: hqAngle(radius), enabled: true, progress: 0, recipe: 0, status: 'running', health: 100, hqLevel: 1 };
}

/** The home base always has an HQ. A game started before it existed gets one, quietly, the first time it runs. */
export function ensureHq(world: WorldState): void {
  // The standard test layout (no day cycle) keeps its bare base, as it always was.
  if (world.rootWorld || world.siteBody || !world.system.sun) return;
  if (!headquarters(world.colony)) world.colony.buildings.unshift(newHq(world.colony.nextId++));
  // Every other world with a base gets a core beside its pad, from the first building there.
  for (const [id, outpost] of Object.entries(world.outposts)) {
    const colony = outpost.colony;
    if (colony.buildings.length === 0 || headquarters(colony)) continue;
    const radius = CELESTIAL[id as BodyId].radius;
    const core = { ...newHq(world.colony.nextId++, radius), core: true };
    colony.buildings.unshift(core);
    colony.nextId = Math.max(colony.nextId, world.colony.nextId);
  }
}

/** Why the HQ cannot go up a level right now, or null. */
export function hqUpgradeBlock(world: WorldState): string | null {
  const hq = headquarters(world.colony);
  if (!hq) return 'There is no Headquarters here.';
  const level = hqLevel(world.colony);
  if (level >= 4) return 'Already at its highest level.';
  const next = levelsFor(world.colony)[(level + 1) as HqLevel];
  const room = productCapacity(world.colony);
  const tooBig = PRODUCTS.find(p => (next.cost[p] ?? 0) > room);
  if (tooBig) return `Needs ${next.cost[tooBig]} ${tooBig}, but storage holds ${room}. Build Storage first.`;
  const short = PRODUCTS.filter(p => availableProduct(world.colony, p) + 1e-9 < (next.cost[p] ?? 0));
  if (short.length > 0) {
    return `Needs ${short.map(p => `${next.cost[p]} ${p} (you have ${Math.floor(availableProduct(world.colony, p))})`).join(', ')}.`;
  }
  if (world.colony.energy < next.upgradeEnergy) {
    return `Needs ${next.upgradeEnergy} kJ stored (you have ${Math.floor(world.colony.energy)}).`;
  }
  return null;
}

/** What each Headquarters level opens, beyond room and storage. */
export const HQ_UNLOCKS: Record<HqLevel, string | null> = {
  1: null,
  2: 'the worker bay',
  3: 'the shipyard',
  4: 'worker drones that reach 900 m and work half again as fast',
};

/** Whether the home Headquarters has reached a level. Games without one (no day cycle) count as having it. */
export function homeHqAtLeast(world: WorldState, level: HqLevel): boolean {
  const root = world.rootWorld ?? world;
  if (!headquarters(root.colony)) return true;
  return hqLevel(root.colony) >= level;
}

export type HqAction = { type: 'upgradeHq'; body?: BodyId };
export const isHqAction = (a: { type: string }): a is HqAction => a.type === 'upgradeHq';

export function upgradeHq(world: WorldState): void {
  const block = hqUpgradeBlock(world);
  if (block) {
    notify(world, block);
    return;
  }
  const hq = headquarters(world.colony)!;
  const next = (hqLevel(world.colony) + 1) as HqLevel;
  const spec = levelsFor(world.colony)[next];
  for (const p of PRODUCTS) world.colony.products[p] -= spec.cost[p] ?? 0;
  world.colony.energy -= spec.upgradeEnergy;
  hq.hqLevel = next;
  notify(world, `${centreName(world.colony).toUpperCase()} LEVEL ${next} · ROOM FOR ${spec.buildings} BUILDINGS`, 6);
}
