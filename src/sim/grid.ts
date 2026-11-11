import { wrap } from './math';
import { isGenerator } from './generators';
import { colonyPlanet } from './localWorld';
import { capacityFactor } from './facilityStats';
import type { Building } from './colony';
import type { WorldState } from './world';

/** Metres along the ground that a plain building reaches to link to its neighbour. */
export const LINK_RANGE = 150;
/** A relay pylon reaches much farther. */
export const RELAY_RANGE = 600;

const reach = (b: Building): number => (b.kind === 'relay' ? RELAY_RANGE * capacityFactor(b) : LINK_RANGE);

/** A building's place in the grid: what it hangs from, how many relays lie between it and the base, and how far. */
interface GridNode { parent: number; relays: number; metres: number }

/**
 * Which building each linked building hangs from (0 is the base at the pad). Null when the whole colony is one grid.
 *
 * Each building takes the route back to the base with the fewest relays on it, and of those the shortest. A relay
 * therefore only carries power between buildings that cannot reach each other any other way: a building near the
 * base links straight to it even with a relay beside it, and a far building hangs from the nearest relay that is
 * itself connected, not from whichever one happened to be found first.
 */
export function linkTree(world: WorldState): Map<number, number> | null {
  const nodes = gridNodes(world);
  if (nodes === null) return null;
  return new Map([...nodes].map(([id, n]) => [id, n.parent]));
}

/** The full route information behind `linkTree`. */
export function gridNodes(world: WorldState): Map<number, GridNode> | null {
  if (!world.system.sun) return null;
  const planet = colonyPlanet(world);
  const metres = (a: number, b: number): number => Math.abs(wrap(a - b)) * planet.radius;
  const rest = world.colony.buildings.filter(b => b.health === undefined || b.health > 0);
  const byId = new Map(rest.map(b => [b.id, b]));
  const root = { id: 0, angle: gridRootAngle(world), range: LINK_RANGE };
  const placed = new Map<number, GridNode & { angle: number; range: number }>();
  placed.set(0, { parent: -1, relays: 0, metres: 0, angle: root.angle, range: root.range });
  // Settle buildings one at a time, cheapest route first (fewest relays, then shortest), like a shortest-path search.
  const best = new Map<number, GridNode>();
  const offer = (from: number) => {
    const node = placed.get(from)!;
    const passes = from !== 0 && byId.get(from)?.kind === 'relay' ? 1 : 0;
    for (const b of rest) {
      if (placed.has(b.id)) continue;
      const gap = metres(node.angle, b.angle);
      if (gap > Math.max(node.range, reach(b)) + 1e-6) continue;
      const candidate = { parent: from, relays: node.relays + passes, metres: node.metres + gap };
      const current = best.get(b.id);
      if (!current || cheaper(candidate, current)) best.set(b.id, candidate);
    }
  };
  offer(0);
  while (best.size > 0) {
    let pick: number | null = null;
    for (const [id, n] of best) if (pick === null || cheaper(n, best.get(pick)!) || (same(n, best.get(pick)!) && id < pick)) pick = id;
    const chosen = best.get(pick!)!;
    best.delete(pick!);
    const b = byId.get(pick!)!;
    placed.set(pick!, { ...chosen, angle: b.angle, range: reach(b) });
    offer(pick!);
  }
  placed.delete(0);
  return new Map([...placed].map(([id, n]) => [id, { parent: n.parent, relays: n.relays, metres: n.metres }]));
}

const cheaper = (a: GridNode, b: GridNode): boolean => a.relays < b.relays || (a.relays === b.relays && a.metres < b.metres - 1e-6);
const same = (a: GridNode, b: GridNode): boolean => a.relays === b.relays && Math.abs(a.metres - b.metres) <= 1e-6;

/** Where the base's grid starts: the landing pad. The Headquarters stands beside it and links straight to it. */
export function gridRootAngle(_world: WorldState): number {
  return 0;
}

/**
 * Which buildings are wired to the base. The base starts at the landing pad; a building joins when it is within
 * reach of one that has already joined (the longer of the two reaches counts). Only in games with the day cycle:
 * without it the whole colony is one grid, as before. Returns null when everything is connected.
 */
export function linkedBuildings(world: WorldState): Set<number> | null {
  const tree = linkTree(world);
  return tree === null ? null : new Set(tree.keys());
}

/** Power one relay can carry, and the share each relay hop keeps. */
export const RELAY_CAPACITY = 10;
export const LINE_KEPT = 0.96;

/**
 * What reaches the base from each generator. Every relay on the way takes a small share, and a relay can only carry so
 * much: past that, everything passing through it is held back evenly. Relays record what they carry in `gridPower`.
 * Nothing here makes power: the delivered total is never more than the raw total.
 */
export function deliverPower(world: WorldState, raw: Map<number, number>): Map<number, number> {
  const tree = linkTree(world);
  if (tree === null) return raw;
  const byId = new Map(world.colony.buildings.map(b => [b.id, b]));
  const relaysOn = (id: number): number[] => {
    const relays: number[] = [];
    for (let at = tree.get(id); at !== undefined && at !== 0; at = tree.get(at)) {
      if (byId.get(at)?.kind === 'relay') relays.push(at);
    }
    return relays;
  };
  const load = new Map<number, number>();
  const paths = new Map<number, number[]>();
  for (const [id, power] of raw) {
    const path = relaysOn(id);
    paths.set(id, path);
    for (const relay of path) load.set(relay, (load.get(relay) ?? 0) + power);
  }
  const share = (relay: number): number => {
    const limit = RELAY_CAPACITY * capacityFactor(byId.get(relay)!);
    return Math.min(1, limit / Math.max(1e-9, load.get(relay) ?? 0));
  };
  const delivered = new Map<number, number>();
  const carried = new Map<number, number>();
  for (const [id, power] of raw) {
    const path = paths.get(id)!;
    const held = path.reduce((least, relay) => Math.min(least, share(relay)), 1);
    const out = power * held * LINE_KEPT ** path.length;
    delivered.set(id, out);
    for (const relay of path) carried.set(relay, (carried.get(relay) ?? 0) + power * held);
  }
  for (const b of world.colony.buildings) if (b.kind === 'relay') b.gridPower = carried.get(b.id) ?? 0;
  return delivered;
}

/**
 * How much of its full power each machine past a relay can get. A relay's capacity is shared by what flows through it:
 * power made beyond it coming in and power used beyond it going out cancel, and only the difference has to be carried.
 * Each relay hop also loses a little, so a far machine works a little slower for the same draw. 1 means no limit.
 */
export function feedLimits(world: WorldState, rated: (b: Building) => number, generated: Map<number, number>): Map<number, number> {
  const tree = linkTree(world);
  const limits = new Map<number, number>();
  if (tree === null) return limits;
  const byId = new Map(world.colony.buildings.map(b => [b.id, b]));
  const relaysOn = (id: number): number[] => {
    const relays: number[] = [];
    for (let at = tree.get(id); at !== undefined && at !== 0; at = tree.get(at)) {
      if (byId.get(at)?.kind === 'relay') relays.push(at);
    }
    return relays;
  };
  const out = new Map<number, number>();
  const consumers: Array<{ id: number; path: number[] }> = [];
  for (const b of world.colony.buildings) {
    if (!tree.has(b.id)) continue;
    const path = relaysOn(b.id);
    if (path.length === 0) continue;
    if (generated.has(b.id)) {
      for (const relay of path) out.set(relay, (out.get(relay) ?? 0) - (generated.get(b.id) ?? 0));
      continue;
    }
    const need = rated(b);
    if (need <= 0) continue;
    consumers.push({ id: b.id, path });
    for (const relay of path) out.set(relay, (out.get(relay) ?? 0) + need);
  }
  for (const { id, path } of consumers) {
    let share = 1;
    for (const relay of path) {
      const carried = out.get(relay) ?? 0;
      const limit = RELAY_CAPACITY * capacityFactor(byId.get(relay)!);
      if (carried > limit) share = Math.min(share, limit / carried);
    }
    limits.set(id, share * LINE_KEPT ** path.length);
  }
  return limits;
}

/**
 * Groups of buildings that are out of reach of the pad but close enough to each other to share power, and that have
 * their own solar array or battery. Each runs as its own small grid. Only with the day cycle on.
 */
export function islandGroups(world: WorldState): Building[][] {
  const tree = linkTree(world);
  if (tree === null) return [];
  const planet = colonyPlanet(world);
  const metres = (a: number, b: number): number => Math.abs(wrap(a - b)) * planet.radius;
  const loose = world.colony.buildings.filter(b => !tree.has(b.id) && (b.health === undefined || b.health > 0));
  const seen = new Set<number>();
  const groups: Building[][] = [];
  for (const start of loose) {
    if (seen.has(start.id)) continue;
    const group: Building[] = [];
    const stack = [start];
    seen.add(start.id);
    while (stack.length > 0) {
      const node = stack.pop()!;
      group.push(node);
      for (const b of loose) {
        if (seen.has(b.id)) continue;
        if (metres(node.angle, b.angle) > Math.max(reach(node), reach(b)) + 1e-6) continue;
        seen.add(b.id);
        stack.push(b);
      }
    }
    if (group.some(b => isGenerator(b.kind) || b.kind === 'battery')) groups.push(group);
  }
  return groups;
}

/** Where a new building would plug into the base's power, for showing while placing it. */
export interface LinkPreview {
  /** Ground angle of the base or building it would link to. */
  fromAngle: number;
  /** Ground angle of the base or building it would link to, as a name for the player. */
  from: 'the pad' | 'a relay' | 'a building';
  /** Metres along the ground to it. */
  metres: number;
  /** The farthest the link can stretch for this placement. */
  reach: number;
  connected: boolean;
}

/**
 * The link a new building would make, by the same rule the grid uses: the connected node it can reach with the
 * fewest relays behind it, and of those the nearest. When nothing is in reach, the nearest connected node, so the
 * player can see how far short it falls. Null in games without the day cycle, where everything is one grid.
 */
export function linkPreview(world: WorldState, kind: Building['kind'], angle: number): LinkPreview | null {
  const nodes = gridNodes(world);
  if (nodes === null) return null;
  const radius = colonyPlanet(world).radius;
  const own = kind === 'relay' ? RELAY_RANGE : LINK_RANGE;
  const byId = new Map(world.colony.buildings.map(b => [b.id, b]));
  const options: Array<{ angle: number; range: number; from: LinkPreview['from']; relays: number }> = [
    { angle: gridRootAngle(world), range: LINK_RANGE, from: 'the pad', relays: 0 },
  ];
  for (const [id, n] of nodes) {
    const b = byId.get(id)!;
    const relays = n.relays + (b.kind === 'relay' ? 1 : 0);
    options.push({ angle: b.angle, range: reach(b), from: b.kind === 'relay' ? 'a relay' : 'a building', relays });
  }
  let best: (LinkPreview & { relays: number }) | null = null;
  for (const o of options) {
    const metres = Math.abs(wrap(angle - o.angle)) * radius;
    const allowed = Math.max(o.range, own);
    const connected = metres <= allowed + 1e-6;
    const view = { fromAngle: o.angle, from: o.from, metres, reach: allowed, connected, relays: o.relays };
    const better = best === null
      || (connected && !best.connected)
      || (connected === best.connected && connected && (o.relays < best.relays || (o.relays === best.relays && metres < best.metres)))
      || (connected === best.connected && !connected && metres - allowed < best.metres - best.reach);
    if (better) best = view;
  }
  if (!best) return null;
  const { relays: _relays, ...preview } = best;
  return preview;
}
