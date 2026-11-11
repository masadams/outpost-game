import { BATTERY_CAPACITY, type Building } from '../../sim/colony';
import { energyCapacity } from '../../sim/colony';
import { BLUEPRINTS } from '../../sim/colonyConfig';
import { capacityFactor } from '../../sim/facilityStats';
import { isGenerator } from '../../sim/generators';
import { gridNodes, islandGroups, LINE_KEPT } from '../../sim/grid';
import { colonyPlanet } from '../../sim/localWorld';
import { WORLD } from '../../sim/config';
import type { WorldState } from '../../sim/world';

/** One power grid at a base: the main one at the pad, or a separate group running on its own. */
export interface GridView {
  id: string;
  name: string;
  /** Where it is, as metres east or west of the pad, for a separate grid. */
  where: string;
  buildings: number;
  makes: number;
  uses: number;
  stored: number;
  capacity: number;
  relays: number;
  /** The most relays any building on it sits behind, and the share of its power that reaches it then. */
  deepest: { relays: number; kept: number } | null;
  /** Short plain notes: what to do about it. */
  notes: string[];
}

export interface GridsView {
  grids: GridView[];
  /** Buildings that are on no grid at all: out of reach and with no power of their own. */
  cut: Array<{ id: number; label: string; where: string }>;
}

const where = (angle: number, radius: number): string => {
  const metres = Math.round((angle - WORLD.padAngle) * radius / 10) * 10;
  return metres >= 0 ? `${metres} m east` : `${-metres} m west`;
};

/** Every grid at the base the player is looking at. Null in games without the day cycle, where all is one grid. */
export function gridsView(w: WorldState): GridsView | null {
  const nodes = gridNodes(w);
  if (nodes === null) return null;
  const c = w.colony;
  const radius = colonyPlanet(w).radius;
  const main = c.buildings.filter(b => nodes.has(b.id));
  const relays = main.filter(b => b.kind === 'relay').length;
  let deepest: GridView['deepest'] = null;
  for (const [, n] of nodes) {
    if (n.relays > 0 && (!deepest || n.relays > deepest.relays)) deepest = { relays: n.relays, kept: LINE_KEPT ** n.relays };
  }
  const mainNotes: string[] = [];
  if (deepest && deepest.relays >= 3) mainNotes.push(`The farthest buildings are ${deepest.relays} relays out and get ${Math.round(deepest.kept * 100)}% of the power sent. A battery and panels out there would help.`);
  if (c.demand > c.generation + 1e-6) mainNotes.push('Using more than it makes: the store is running down.');
  const grids: GridView[] = [{
    id: 'main',
    name: 'Base grid',
    where: 'At the pad',
    buildings: main.length,
    makes: c.generation,
    uses: c.demand,
    stored: c.energy,
    capacity: energyCapacity(c),
    relays,
    deepest,
    notes: mainNotes,
  }];
  const islands = islandGroups(w);
  islands.forEach((group, i) => {
    const centre = group.reduce((sum, b) => sum + b.angle, 0) / group.length;
    const batteries = group.filter(b => b.kind === 'battery');
    const capacity = batteries.reduce((sum, b) => sum + BATTERY_CAPACITY * capacityFactor(b), 0);
    const stored = batteries.reduce((sum, b) => sum + (b.charge ?? 0), 0);
    const makes = group.filter(b => isGenerator(b.kind)).reduce((sum, b) => sum + (b.gridPower ?? 0), 0);
    const uses = group.filter(b => !isGenerator(b.kind)).reduce((sum, b) => sum + (b.requestedPower ?? 0), 0);
    const notes = ['Runs on its own. A relay line to the base would join it to the base grid.'];
    if (capacity <= 0) notes.push('No battery: it stops at night.');
    grids.push({
      id: `island-${i}`,
      name: `Separate grid ${i + 1}`,
      where: where(centre, radius),
      buildings: group.length,
      makes,
      uses,
      stored,
      capacity,
      relays: group.filter(b => b.kind === 'relay').length,
      deepest: null,
      notes,
    });
  });
  const onIsland = new Set(islands.flat().map(b => b.id));
  const cut = c.buildings
    .filter((b: Building) => !nodes.has(b.id) && !onIsland.has(b.id) && (b.health === undefined || b.health > 0))
    .map(b => ({ id: b.id, label: BLUEPRINTS[b.kind].label, where: where(b.angle, radius) }));
  return { grids, cut };
}
