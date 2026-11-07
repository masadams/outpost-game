import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { linkedBuildings, linkPreview, LINK_RANGE, RELAY_RANGE } from '../src/sim/grid';
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

describe('demand through relays', () => {
  it('a machine past a relay works a little slower for each hop, and a busy relay shares what it can carry', async () => {
    const { feedLimits, LINE_KEPT, RELAY_CAPACITY } = await import('../src/sim/grid');
    const w = base();
    const relay = completedBuilding(1, 'relay', metres(500), w);
    const lab = completedBuilding(2, 'observatory', metres(560), w);
    w.colony.buildings.push(relay, lab);
    const light = feedLimits(w, b => (b.kind === 'observatory' ? 3 : 0), new Map());
    expect(light.get(2)).toBeCloseTo(LINE_KEPT, 9);
    const heavy = feedLimits(w, b => (b.kind === 'observatory' ? RELAY_CAPACITY * 2 : 0), new Map());
    expect(heavy.get(2)).toBeCloseTo(0.5 * LINE_KEPT, 9);
  });

  it('power made out past the relay cancels power used there: only the difference is carried', async () => {
    const { feedLimits, LINE_KEPT, RELAY_CAPACITY } = await import('../src/sim/grid');
    const w = base();
    w.colony.buildings.push(completedBuilding(1, 'relay', metres(500), w), completedBuilding(2, 'observatory', metres(560), w), completedBuilding(3, 'solar', metres(600), w));
    const out = feedLimits(w, b => (b.kind === 'observatory' ? RELAY_CAPACITY * 2 : 0), new Map([[3, RELAY_CAPACITY]]));
    expect(out.get(2)).toBeCloseTo(LINE_KEPT, 9);
  });

  it('a machine near the pad is not limited', async () => {
    const { feedLimits } = await import('../src/sim/grid');
    const w = base();
    w.colony.buildings.push(completedBuilding(1, 'observatory', metres(80), w));
    expect(feedLimits(w, () => 3, new Map()).has(1)).toBe(false);
  });
});

describe('islands', () => {
  function farCluster() {
    const w = base();
    w.colony.buildings.push(completedBuilding(1, 'battery', metres(60), w));
    const relay = completedBuilding(2, 'relay', metres(500), w);
    const solar = completedBuilding(3, 'solar', metres(1000), w);
    const battery = completedBuilding(4, 'battery', metres(1030), w);
    const lab = completedBuilding(5, 'observatory', metres(1060), w);
    w.colony.buildings.push(relay, solar, battery, lab);
    w.colony.nextId = 10;
    return { w, relay, solar, battery, lab };
  }
  const total = (w: ReturnType<typeof base>) => w.colony.energy + w.colony.buildings.reduce((s, b) => s + (b.charge ?? 0), 0);

  it('a cut-off cluster with its own power keeps running, and takes its battery\'s share with it', () => {
    const { w, relay, battery, lab } = farCluster();
    w.colony.energy = 1000;
    stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(battery.linked).toBeUndefined();
    const before = total(w);
    w.colony.buildings = w.colony.buildings.filter(b => b !== relay);
    stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(battery.linked).toBe(false);
    expect(battery.charge).toBeGreaterThan(0);
    // Only sunlight on the panels adds anything in one step.
    expect(total(w)).toBeLessThanOrEqual(before + 1);
    expect(total(w)).toBeGreaterThan(before - 50);
    for (let i = 0; i < 60 * 20; i++) stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(lab.island).toBe(true);
    expect(['running', 'starting']).toContain(lab.status);
  });

  it('reconnecting brings the island\'s charge back into the base without making any', () => {
    const { w, relay, battery } = farCluster();
    w.colony.energy = 600;
    stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    w.colony.buildings = w.colony.buildings.filter(b => b !== relay);
    stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    const split = total(w);
    w.colony.buildings.push(relay);
    // Night so nothing generates during the check.
    for (const b of w.colony.buildings) if (b.kind === 'solar') b.enabled = false;
    for (const b of w.colony.buildings) if (b.kind === 'observatory') b.enabled = false;
    stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(battery.linked).toBeUndefined();
    expect(battery.charge).toBeUndefined();
    expect(total(w)).toBeCloseTo(split, 3);
  });

  it('a lone machine with no power of its own is not an island: it says it is not connected', async () => {
    const { islandGroups } = await import('../src/sim/grid');
    const w = base();
    w.colony.buildings.push(completedBuilding(1, 'observatory', metres(900), w));
    expect(islandGroups(w)).toEqual([]);
  });
});

describe('placement preview', () => {
  it('is off when the day cycle is off', () => {
    expect(linkPreview(createWorld(), 'relay', metres(300))).toBeNull();
  });

  it('a relay links to the pad out to its full reach, and not beyond', () => {
    const w = base();
    const ok = linkPreview(w, 'relay', metres(RELAY_RANGE - 5))!;
    expect(ok).toMatchObject({ from: 'the pad', connected: true, reach: RELAY_RANGE });
    const far = linkPreview(w, 'relay', metres(RELAY_RANGE + 20))!;
    expect(far.connected).toBe(false);
  });

  it('a plain building reaches only as far as the pad does, but a relay in the chain extends it', () => {
    const w = base();
    expect(linkPreview(w, 'solar', metres(LINK_RANGE + 30))!.connected).toBe(false);
    w.colony.buildings.push(completedBuilding(1, 'relay', metres(500), w));
    const after = linkPreview(w, 'solar', metres(1000))!;
    expect(after).toMatchObject({ from: 'a relay', connected: true });
  });

  it('a relay chain can be extended from the last relay', () => {
    const w = base();
    w.colony.buildings.push(completedBuilding(1, 'relay', metres(590), w));
    const next = linkPreview(w, 'relay', metres(1150))!;
    expect(next).toMatchObject({ from: 'a relay', connected: true });
    expect(Math.round(next.metres)).toBe(560);
  });
});
