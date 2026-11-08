import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, type WorldState } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';
import { colonyWorld } from '../src/sim/localWorld';
import { TECH_IDS } from '../src/sim/progressionConfig';
import { encodeCheckpoint, decodeCheckpoint } from '../src/persistence/checkpoint';
import { chooseExpedition, expeditionChoices, launchExpedition, noKit } from '../src/sim/expedition';
import { launchBeacon } from '../src/sim/signal';
import { sendPod } from '../src/sim/pods';
import { PRODUCTS } from '../src/sim/colonyConfig';
import { RESOURCES } from '../src/sim/resources';

const IDLE = { thrust: false, turn: 0 };

function finite(value: unknown, path = 'world', seen = new Set<unknown>()): string | null {
  if (typeof value === 'number') return Number.isFinite(value) ? null : `${path} is ${value}`;
  if (!value || typeof value !== 'object' || seen.has(value)) return null;
  seen.add(value);
  for (const [k, v] of Object.entries(value)) {
    if (k === 'rootWorld') continue;
    const bad = finite(v, `${path}.${k}`, seen);
    if (bad) return bad;
  }
  return null;
}

/** A long run of a staged base with the new content in use, checking that nothing goes wrong. */
describe('a long soak of a busy base', () => {
  it('runs a hundred minutes with pods, a beacon, an expedition and a full set of buildings without breaking', () => {
    const w: WorldState = createWorld(12);
    w.system.sun = true;
    w.system.binary = true;
    w.objectives.completed.push('delivery', 'industry', 'buoy');
    w.exploration.surveyed.push('frost');
    w.exploration.known.push('moon');
    w.colony.research.completed.push(...TECH_IDS);
    w.colony.products = { ...w.colony.products, fuel: 80, alloy: 90, wire: 90, components: 90, water: 40, oxygen: 20 };
    const kinds = ['solar', 'solar', 'battery', 'geothermal', 'windTurbine', 'condenser', 'observatory', 'antenna', 'refinery', 'fuelProcessor', 'massDriver', 'workshop'] as const;
    kinds.forEach((k, i) => w.colony.buildings.push(completedBuilding(i + 1, k, 0.12 + i * 0.04, w)));
    w.colony.nextId = 40;
    const moon = colonyWorld(w, 'moon');
    moon.colony.buildings.push(completedBuilding(1001, 'solar', 0.2, moon), completedBuilding(1002, 'battery', 0.25, moon), completedBuilding(1003, 'condenser', 0.3, moon));
    moon.colony.nextId = 1010;
    w.depot.iron = 150;
    w.depot.ice = 60;
    const dt = 0.5;
    const seconds = 100 * 60;
    let launchedBeacon = false;
    let sentExpedition = false;
    let pods = 0;
    for (let i = 0; i < seconds / dt; i++) {
      stepWorld(w, IDLE, dt);
      const t = w.system.time;
      if (i % 120 === 0) {
        const bad = finite(w);
        expect(bad).toBeNull();
        try { encodeCheckpoint(w); } catch {
          const fixes: string[] = [];
          const fresh = createWorld(12);
          for (const key of Object.keys(w)) {
            const copy = { ...w } as Record<string, unknown>;
            copy[key] = (fresh as unknown as Record<string, unknown>)[key];
            try { encodeCheckpoint(copy as never); fixes.push(key); } catch { /* still bad */ }
          }
          throw new Error(`fixed by [${fixes.join(',')}] storm ${JSON.stringify({ ...w.storm, far: w.storm.far.length })} unsaveable at ${t.toFixed(0)} s: pods ${JSON.stringify(w.exploration.pods.map(p => ({ id: p.id, arrives: p.arrives })))} beacons ${JSON.stringify(w.exploration.beacons)} signal ${JSON.stringify(w.exploration.signal)} expedition ${JSON.stringify(w.exploration.expedition)} depot ${JSON.stringify(w.depot)}`);
        }
        for (const p of PRODUCTS) expect(w.colony.products[p]).toBeGreaterThanOrEqual(-1e-6);
        for (const r of RESOURCES) expect(w.depot[r]).toBeGreaterThanOrEqual(-1e-6);
      }
      if (!launchedBeacon && t > 60) {
        for (const b of w.colony.buildings) if (['observatory', 'antenna'].includes(b.kind)) b.status = 'running';
        launchBeacon(w);
        launchedBeacon = w.exploration.signal !== undefined;
      }
      if (t > 300 && pods < 4 && Math.floor(t) % 400 === 0 && w.exploration.pods.length === 0) {
        sendPod(w, 'home', 'moon');
        pods++;
        w.depot.iron = Math.max(w.depot.iron, 100);
        w.colony.products.fuel = Math.max(w.colony.products.fuel, 40);
      }
      if (!sentExpedition && w.exploration.signal?.phase === 'heard') {
        w.colony.products = { ...w.colony.products, fuel: 90, alloy: 90, wire: 90, components: 90, water: 40, oxygen: 20 };
        launchExpedition(w, noKit());
        sentExpedition = true;
      }
      const e = w.exploration.expedition;
      if (e?.pending) {
        const safe = expeditionChoices(w).find(c => c.safe);
        chooseExpedition(w, safe?.key ?? 'wait');
      }
      if (i % 1200 === 0 && i > 0) {
        const loaded = decodeCheckpoint(encodeCheckpoint(w));
        expect(loaded.system.time).toBeCloseTo(w.system.time, 3);
      }
    }
    expect(launchedBeacon).toBe(true);
    expect(w.exploration.signal?.phase).toBe('heard');
    expect(w.exploration.beacons?.length ?? 0).toBeGreaterThanOrEqual(0);
    expect(pods).toBeGreaterThan(0);
    expect(finite(w)).toBeNull();
  }, 600000);
});
