import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';
import { gridNodes, linkPreview } from '../src/sim/grid';
import { gridsView } from '../src/ui/base/gridsView';
import type { BuildType } from '../src/sim/colonyConfig';

const R = 1800;
function base(layout: Array<[BuildType, number]>) {
  const w = createWorld(4242);
  w.system.sun = true;
  w.asteroids = [];
  layout.forEach(([kind, metres], i) => w.colony.buildings.push(completedBuilding(i + 1, kind, metres / R, w)));
  w.colony.nextId = layout.length + 1;
  return w;
}

describe('power grid routing', () => {
  it('links a building near the base straight to it, even with a relay beside it', () => {
    const w = base([['relay', 60], ['solar', 120]]);
    const nodes = gridNodes(w)!;
    expect(nodes.get(2)!.relays).toBe(0);
  });

  it('hangs a far building from the nearest connected relay, not the first one found', () => {
    // Two relays in a chain eastward; a building past the second hangs from the second.
    const w = base([['relay', 140], ['relay', 700], ['solar', 1250]]);
    const nodes = gridNodes(w)!;
    expect(nodes.get(3)!.parent).toBe(2);
    expect(nodes.get(3)!.relays).toBe(2);
  });

  it('previews the same link the grid will make', () => {
    const w = base([['relay', 140], ['relay', 700]]);
    const preview = linkPreview(w, 'solar', 1200 / R)!;
    expect(preview.connected).toBe(true);
    expect(Math.round(preview.fromAngle * R)).toBe(700);
  });

  it('shows separate grids and cut-off buildings', () => {
    const w = base([['solar', -900], ['battery', -930], ['refinery', 1500]]);
    const view = gridsView(w)!;
    expect(view.grids.map(g => g.name)).toEqual(['Base grid', 'Separate grid 1']);
    expect(view.grids[1].where).toBe('910 m west');
    expect(view.cut.map(b => b.label)).toEqual(['Refinery']);
  });
});
