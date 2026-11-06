import { wrap } from './math';
import { colonyPlanet } from './localWorld';
import { capacityFactor } from './facilityStats';
import type { Building } from './colony';
import type { WorldState } from './world';

/** Metres along the ground that a plain building reaches to link to its neighbour. */
export const LINK_RANGE = 150;
/** A relay pylon reaches much farther. */
export const RELAY_RANGE = 600;

const reach = (b: Building): number => (b.kind === 'relay' ? RELAY_RANGE * capacityFactor(b) : LINK_RANGE);

/**
 * Which buildings are wired to the base. The base starts at the landing pad; a building joins when it is within
 * reach of one that has already joined (the longer of the two reaches counts). Only in games with the day cycle:
 * without it the whole colony is one grid, as before. Returns null when everything is connected.
 */
export function linkedBuildings(world: WorldState): Set<number> | null {
  if (!world.system.sun) return null;
  const planet = colonyPlanet(world);
  const metres = (a: number, b: number): number => Math.abs(wrap(a - b)) * planet.radius;
  const buildings = world.colony.buildings;
  const linked = new Set<number>();
  const frontier: Array<{ angle: number; range: number }> = [{ angle: 0, range: LINK_RANGE }];
  const rest = buildings.filter(b => b.health === undefined || b.health > 0);
  while (frontier.length > 0) {
    const node = frontier.pop()!;
    for (const b of rest) {
      if (linked.has(b.id)) continue;
      if (metres(node.angle, b.angle) > Math.max(node.range, reach(b)) + 1e-6) continue;
      linked.add(b.id);
      frontier.push({ angle: b.angle, range: reach(b) });
    }
  }
  return linked;
}
