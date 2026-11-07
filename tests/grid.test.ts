import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { linkedBuildings, LINK_RANGE, RELAY_RANGE } from '../src/sim/grid';
import { completedBuilding } from '../src/sim/construction';
import { WORLD } from '../src/sim/config';

const metres = (m: number) => m / WORLD.radius;

function base() {
  const w = createWorld();
  w.system.sun = true;
  w.colony.buildings = [];
  return w;
}

describe('power links', () => {
  it('everything is one grid when the day cycle is off', () => {
    const w = createWorld();
    w.colony.buildings.push(completedBuilding(1, 'solar', 2, w));
    expect(linkedBuildings(w)).toBeNull();
  });

  it('a building joins by being near the pad or near one that has joined', () => {
    const w = base();
    const near = completedBuilding(1, 'solar', metres(100), w);
    const chain = completedBuilding(2, 'battery', metres(100 + LINK_RANGE - 10), w);
    const far = completedBuilding(3, 'refinery', metres(900), w);
    w.colony.buildings.push(near, chain, far);
    const linked = linkedBuildings(w)!;
    expect(linked.has(1)).toBe(true);
    expect(linked.has(2)).toBe(true);
    expect(linked.has(3)).toBe(false);
  });

  it('a relay carries the link much farther', () => {
    const w = base();
    const relay = completedBuilding(1, 'relay', metres(RELAY_RANGE - 20), w);
    const field = completedBuilding(2, 'solar', metres(RELAY_RANGE + 400), w);
    w.colony.buildings.push(relay, field);
    expect(linkedBuildings(w)!.has(1)).toBe(true);
    expect(linkedBuildings(w)!.has(2)).toBe(true);
  });

  it('a far solar field gives nothing until it is wired, and an unwired machine says why', () => {
    const w = base();
    const field = completedBuilding(1, 'solar', metres(2000), w);
    const lab = completedBuilding(2, 'observatory', metres(1800), w);
    w.colony.buildings.push(field, lab);
    stepWorld(w, { thrust: false, turn: 0 }, 0.25);
    expect(w.colony.generation).toBe(0);
    expect(lab.status).toBe('no power');
    expect(lab.linked).toBe(false);
    w.colony.buildings.push(completedBuilding(3, 'relay', metres(500), w), completedBuilding(4, 'relay', metres(1100), w), completedBuilding(5, 'relay', metres(1700), w));
    stepWorld(w, { thrust: false, turn: 0 }, 0.25);
    expect(lab.linked).toBeUndefined();
  });
});

describe('relay capacity and loss', () => {
  async function field(panels: number, relays: number) {
    const { deliverPower, RELAY_CAPACITY, LINE_KEPT } = await import('../src/sim/grid');
    const w = base();
    const list = [];
    for (let i = 0; i < relays; i++) list.push(completedBuilding(10 + i, 'relay', metres(500 + i * 560), w));
    const farAt = 500 + (relays - 1) * 560 + 60;
    for (let i = 0; i < panels; i++) list.push(completedBuilding(100 + i, 'solar', metres(farAt + i * 5), w));
    w.colony.buildings.push(...list);
    const raw = new Map(list.filter(b => b.kind === 'solar').map(b => [b.id, 8]));
    return { w, out: deliverPower(w, raw), raw, RELAY_CAPACITY, LINE_KEPT };
  }

  it('each relay hop keeps a little less, and never more than was made', async () => {
    const { out, raw, LINE_KEPT } = await field(1, 2);
    const delivered = [...out.values()][0];
    expect(delivered).toBeCloseTo(8 * LINE_KEPT ** 2, 6);
    expect(delivered).toBeLessThan([...raw.values()][0]);
  });

  it('a relay carries only so much: more panels behind it than it can carry are held back evenly', async () => {
    const { w, out, RELAY_CAPACITY } = await field(4, 1);
    const total = [...out.values()].reduce((a, b) => a + b, 0);
    expect(total).toBeLessThanOrEqual(RELAY_CAPACITY + 1e-6);
    const relay = w.colony.buildings.find(b => b.kind === 'relay')!;
    expect(relay.gridPower).toBeCloseTo(RELAY_CAPACITY, 6);
    const each = [...out.values()];
    expect(Math.max(...each) - Math.min(...each)).toBeLessThan(1e-9);
  });

  it('panels near the pad pay nothing, and an upgraded relay carries more', async () => {
    const { deliverPower } = await import('../src/sim/grid');
    const w = base();
    const near = completedBuilding(1, 'solar', metres(60), w);
    w.colony.buildings.push(near);
    expect(deliverPower(w, new Map([[1, 8]])).get(1)).toBe(8);
    const heavy = await field(4, 1);
    const relay = heavy.w.colony.buildings.find(b => b.kind === 'relay')!;
    relay.level = 2;
    const raw = new Map(heavy.w.colony.buildings.filter(b => b.kind === 'solar').map(b => [b.id, 8]));
    const total = [...deliverPower(heavy.w, raw).values()].reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(heavy.RELAY_CAPACITY);
  });
});
