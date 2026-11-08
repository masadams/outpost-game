import { describe, expect, it } from 'vitest';
import { createWorld, type WorldState } from '../src/sim/world';
import { stepColony } from '../src/sim/colony';
import { completedBuilding } from '../src/sim/construction';
import { STEP } from '../src/sim/config';
import { launchBeacon, stepSignal } from '../src/sim/signal';
import { EXPEDITION, expeditionCost, expeditionError, launchExpedition, legRisk, noKit, oddsWord, stepExpedition } from '../src/sim/expedition';
import { encodeCheckpoint, decodeCheckpoint } from '../src/persistence/checkpoint';
import { baseView } from '../src/ui/base/baseView';
import { TECH_IDS } from '../src/sim/progressionConfig';

function heard(seed = 7): WorldState {
  const w = createWorld(seed);
  w.system.sun = true;
  w.colony.research.completed.push(...TECH_IDS.filter(t => t !== 'photovoltaics' && t !== 'labAutomation'));
  w.colony.products = { ...w.colony.products, fuel: 90, alloy: 90, wire: 90, components: 90, water: 60, oxygen: 40 };
  w.colony.buildings.push(
    completedBuilding(1, 'solar', 0.12, w), completedBuilding(2, 'battery', 0.14, w),
    completedBuilding(3, 'observatory', 0.17, w), completedBuilding(4, 'antenna', 0.2, w),
  );
  w.colony.nextId = 10;
  w.colony.energy = 20;
  for (let i = 0; i < 400; i++) stepColony(w, STEP);
  launchBeacon(w);
  w.system.time = w.exploration.signal!.hearAt + 1;
  stepSignal(w);
  return w;
}

describe('the expedition', () => {
  it('waits for the echo, then costs the craft plus whatever is packed', () => {
    const early = createWorld(7);
    expect(expeditionError(early, noKit())).toMatch(/hear back/);
    const w = heard();
    expect(expeditionError(w, noKit())).toBeNull();
    expect(expeditionCost(noKit())).toEqual(EXPEDITION.craft);
    expect(expeditionCost({ fuel: true, shielding: true, stores: true })).toMatchObject({ alloy: 54, components: 20, fuel: 60, water: 20, oxygen: 10 });
    w.colony.products.alloy = 10;
    expect(expeditionError(w, noKit())).toMatch(/Needs 30 alloy \(you have 10\)/);
  });

  it('packing for the hazard cuts the risk, and the odds read in plain words', () => {
    expect(legRisk('strong radiation', { fuel: false, shielding: true, stores: false })).toBeLessThan(legRisk('strong radiation', noKit()));
    expect(legRisk('quiet', { fuel: true, shielding: true, stores: true })).toBeGreaterThanOrEqual(0.03);
    const all = { fuel: true, shielding: true, stores: true };
    expect(oddsWord('strong radiation', all)).not.toBe(oddsWord('strong radiation', noKit()));
  });

  it('leaves, is away a long while, comes back with a report, and cannot be sent twice at once', () => {
    const w = heard();
    const alloy = w.colony.products.alloy;
    launchExpedition(w, noKit());
    expect(w.colony.products.alloy).toBe(alloy - 30);
    const e = w.exploration.expedition!;
    expect(e.returnsAt - e.launchedAt).toBeGreaterThan(1200);
    expect(expeditionError(w, noKit())).toMatch(/already out/);
    w.system.time = e.returnsAt - 1;
    stepExpedition(w);
    expect(e.phase).toBe('out');
    w.system.time = e.returnsAt + 1;
    stepExpedition(w);
    expect(e.phase).toBe('back');
    expect(e.report).not.toBeNull();
    expect(expeditionError(w, noKit())).toBeNull();
  });

  it('is deterministic for a save and kit, and a better kit never does worse across many saves', () => {
    const results = (kit: ReturnType<typeof noKit>) => Array.from({ length: 40 }, (_, i) => {
      const w = heard(100 + i);
      launchExpedition(w, kit);
      w.system.time = w.exploration.expedition!.returnsAt + 1;
      stepExpedition(w);
      return w.exploration.expedition!.report!.result;
    });
    const bare = results(noKit());
    expect(results(noKit())).toEqual(bare);
    const lost = (r: string[]) => r.filter(x => x === 'lost').length;
    const full = (r: string[]) => r.filter(x => x === 'full').length;
    const packed = results({ fuel: true, shielding: true, stores: true });
    expect(lost(packed)).toBeLessThanOrEqual(lost(bare));
    expect(full(packed)).toBeGreaterThanOrEqual(full(bare));
    expect(new Set(bare).size).toBeGreaterThan(1);
  });

  it('a run that comes home pays in ore and, if it went well, a technology; a lost one pays nothing', () => {
    let paid = 0;
    let lostOne = false;
    for (let seed = 200; seed < 420 && (paid < 2 || !lostOne); seed++) {
      const w = heard(seed);
      w.exploration.signal!.echo!.hazard = 'strong radiation';
      const researched = w.colony.research.completed.length;
      const ore = w.depot.rareMetals + w.depot.silicon;
      launchExpedition(w, noKit());
      w.system.time = w.exploration.expedition!.returnsAt + 1;
      stepExpedition(w);
      const report = w.exploration.expedition!.report!;
      if (report.result === 'lost') {
        lostOne = true;
        expect(w.depot.rareMetals + w.depot.silicon).toBe(ore);
        expect(w.colony.research.completed.length).toBe(researched);
      } else {
        paid++;
        expect(w.depot.rareMetals + w.depot.silicon).toBeGreaterThan(ore);
      }
    }
    expect(paid).toBeGreaterThanOrEqual(1);
    expect(lostOne).toBe(true);
  });

  it('shows on the Base screen and saves at every stage', () => {
    const w = heard();
    const view = baseView(w).signal!.expedition!;
    expect(view.state).toBe('plan');
    expect(Object.keys(view.plans)).toHaveLength(8);
    launchExpedition(w, { fuel: true, shielding: false, stores: false });
    expect(baseView(w).signal!.expedition!.state).toBe('out');
    expect(decodeCheckpoint(encodeCheckpoint(w)).exploration.expedition?.phase).toBe('out');
    w.system.time = w.exploration.expedition!.returnsAt + 1;
    stepExpedition(w);
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(loaded.exploration.expedition?.report?.lines.length).toBeGreaterThan(0);
  });
});
