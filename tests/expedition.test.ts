import { describe, expect, it } from 'vitest';
import { createWorld, type WorldState } from '../src/sim/world';
import { stepColony } from '../src/sim/colony';
import { completedBuilding } from '../src/sim/construction';
import { STEP } from '../src/sim/config';
import { launchBeacon, stepSignal } from '../src/sim/signal';
import { EXPEDITION, DECISION_SECONDS, chooseExpedition, expeditionChoices, expeditionCost, expeditionError, launchExpedition, legRisk, noKit, oddsWord, SALVAGE, stepExpedition } from '../src/sim/expedition';
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

/** Plays an expedition out to the end, answering each trouble with the given policy. */
function runOut(w: WorldState, policy: 'push' | 'wait' | 'best'): void {
  for (let guard = 0; guard < 40 && w.exploration.expedition!.phase === 'out'; guard++) {
    const e = w.exploration.expedition!;
    w.system.time = Math.max(w.system.time, e.pending ? w.system.time : e.returnsAt + 1);
    stepExpedition(w);
    if (e.pending?.kind === 'find') {
      chooseExpedition(w, 'leave');
      continue;
    }
    if (e.pending) {
      const choices = expeditionChoices(w);
      const safe = choices.find(c => c.safe);
      chooseExpedition(w, policy === 'best' && safe ? safe.key : policy === 'wait' ? 'wait' : 'push');
    }
  }
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
    w.system.time = e.launchedAt + 1;
    stepExpedition(w);
    expect(e.phase).toBe('out');
    runOut(w, 'push');
    expect(e.phase).toBe('back');
    expect(e.report).not.toBeNull();
    expect(expeditionError(w, noKit())).toBeNull();
  });

  it('is deterministic for a save and kit, and a better kit never does worse across many saves', () => {
    const results = (kit: ReturnType<typeof noKit>) => Array.from({ length: 40 }, (_, i) => {
      const w = heard(100 + i);
      launchExpedition(w, kit);
      runOut(w, kit.fuel || kit.shielding || kit.stores ? 'best' : 'push');
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
      runOut(w, 'push');
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
    runOut(w, 'push');
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(loaded.exploration.expedition?.report?.lines.length).toBeGreaterThan(0);
  });
});

describe('trouble on the way', () => {
  function findTrouble(kit = noKit()): WorldState {
    for (let seed = 1; seed < 300; seed++) {
      const w = heard(seed);
      w.exploration.signal!.echo!.hazard = 'strong radiation';
      launchExpedition(w, kit);
      const e = w.exploration.expedition!;
      for (let i = 0; i < 200 && (!e.pending || e.pending.kind === 'find') && e.phase === 'out'; i++) {
        if (e.pending?.kind === 'find') chooseExpedition(w, 'leave');
        w.system.time += 60;
        stepExpedition(w);
      }
      if (e.pending && !e.pending.kind) return w;
    }
    throw new Error('no trouble found');
  }

  it('stops and asks: every trouble offers push on and wait, and packs add certain answers', () => {
    const bare = findTrouble();
    expect(expeditionChoices(bare).map(c => c.key)).toEqual(['push', 'wait']);
    expect(baseView(bare).signal!.expedition!.state).toBe('trouble');
    const packed = findTrouble({ fuel: true, shielding: true, stores: true });
    expect(expeditionChoices(packed).map(c => c.key)).toEqual(['push', 'wait', 'shields', 'burn', 'stores']);
    expect(expeditionChoices(packed).filter(c => c.safe)).toHaveLength(3);
  });

  it('a certain answer uses up its pack and costs nothing else; it cannot be used twice', () => {
    const w = findTrouble({ fuel: true, shielding: true, stores: false });
    const e = w.exploration.expedition!;
    chooseExpedition(w, 'shields');
    expect(e.setbacks).toBe(0);
    expect(e.used.shielding).toBe(true);
    expect(e.pending).toBeNull();
    expect(e.log.at(-1)).toMatch(/shields held/);
    expect(expeditionChoices(w).map(c => c.key)).not.toContain('shields');
  });

  it('waiting adds minutes to the trip; pushing on is a gamble that can cost a setback', () => {
    const w = findTrouble();
    const e = w.exploration.expedition!;
    const home = e.returnsAt;
    chooseExpedition(w, 'wait');
    expect(e.returnsAt).toBe(home + 300);
    const losers = Array.from({ length: 30 }, (_, i) => {
      const t = findTroubleAt(i);
      chooseExpedition(t, 'push');
      return t.exploration.expedition!.setbacks;
    });
    expect(Math.min(...losers)).toBe(0);
    expect(Math.max(...losers)).toBe(1);
  });

  function findTroubleAt(offset: number): WorldState {
    let found = 0;
    for (let seed = 1; seed < 800; seed++) {
      const w = heard(seed);
      w.exploration.signal!.echo!.hazard = 'strong radiation';
      launchExpedition(w, noKit());
      const e = w.exploration.expedition!;
      for (let i = 0; i < 200 && (!e.pending || e.pending.kind === 'find') && e.phase === 'out'; i++) {
        if (e.pending?.kind === 'find') chooseExpedition(w, 'leave');
        w.system.time += 60;
        stepExpedition(w);
      }
      if (e.pending && !e.pending.kind && found++ === offset) return w;
    }
    throw new Error('not enough trouble');
  }

  it('an unanswered trouble is waited out after a few minutes, and a bad choice is refused', () => {
    const w = findTrouble();
    const e = w.exploration.expedition!;
    chooseExpedition(w, 'shields');
    expect(e.pending).not.toBeNull();
    expect(w.notice.message).toMatch(/not an option/);
    w.system.time = e.pending!.deadline + 1;
    stepExpedition(w);
    expect(e.pending).toBeNull();
    expect(e.log.at(-1)).toMatch(/waited|held/);
    expect(DECISION_SECONDS).toBe(300);
  });

  it('saves with trouble waiting', () => {
    const w = findTrouble({ fuel: true, shielding: false, stores: false });
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(loaded.exploration.expedition?.pending).toEqual(w.exploration.expedition!.pending);
    expect(loaded.exploration.expedition?.log).toEqual(w.exploration.expedition!.log);
  });
});

import { farWorlds } from '../src/sim/farWorlds';
import { legCount, legRiskAt } from '../src/sim/expedition';

describe('the far system and landing on it', () => {
  it('has as many worlds as the beacon said, the same every time, with gas giants you cannot land on', () => {
    const w = heard();
    const echo = w.exploration.signal!.echo!;
    const worlds = farWorlds(w.seed, echo);
    expect(worlds).toHaveLength(echo.worlds);
    expect(farWorlds(w.seed, echo)).toEqual(worlds);
    const kinds = new Set<string>();
    for (let seed = 1; seed < 60; seed++) for (const f of farWorlds(seed, { ...echo, worlds: 6 })) kinds.add(f.kind);
    expect(kinds.size).toBeGreaterThanOrEqual(4);
    for (const f of farWorlds(3, { ...echo, worlds: 7 })) expect(f.landable).toBe(f.kind !== 'gas');
  });

  it('a fly-by surveys the next world in order; you cannot land on one you have not surveyed', () => {
    const w = heard();
    expect(expeditionError(w, noKit(), 0)).toMatch(/Fly past that world first/);
    launchExpedition(w, noKit());
    runOut(w, 'best');
    const e = w.exploration.expedition!;
    if (e.report!.result !== 'lost') {
      expect(w.exploration.signal!.surveyed).toEqual([0]);
      expect(e.report!.lines.join(' ')).toMatch(/Surveyed .* I:/);
    }
  });

  it('landing adds a leg, brings home the world\'s own kind of ore, and is riskier than a fly-by', () => {
    expect(legCount(null)).toBe(3);
    expect(legCount(0)).toBe(4);
    const w = heard();
    const echo = w.exploration.signal!.echo!;
    echo.worlds = 6;
    const worlds = farWorlds(w.seed, echo);
    const world = worlds.find(f => f.landable && f.kind !== 'gas')!;
    w.exploration.signal!.surveyed = worlds.map(f => f.index);
    expect(legRiskAt(echo.hazard, noKit(), world, 3)).toBeGreaterThan(0.1);
    expect(legRiskAt(echo.hazard, noKit(), world, 0)).toBe(legRiskAt(echo.hazard, noKit(), null, 0));
    let landings = 0;
    for (let seed = 300; seed < 330 && landings < 3; seed++) {
      const t = heard(seed);
      const e2 = t.exploration.signal!.echo!;
      e2.worlds = 6;
      const ws = farWorlds(t.seed, e2);
      const target = ws.find(f => f.landable)!;
      t.exploration.signal!.surveyed = ws.map(f => f.index);
      const before = { ...t.depot };
      launchExpedition(t, { fuel: true, shielding: true, stores: true }, target.index);
      runOut(t, 'best');
      if (t.exploration.expedition!.report!.result === 'lost') continue;
      landings++;
      for (const resource of Object.keys(target.haul)) expect(t.depot[resource as keyof typeof t.depot]).toBeGreaterThan(before[resource as keyof typeof before]);
      expect(t.exploration.expedition!.report!.lines.join(' ')).toMatch(/Landed on/);
    }
    expect(landings).toBeGreaterThanOrEqual(1);
  });

  it('refuses to land on a gas giant, and saves with a target and surveyed worlds', () => {
    const w = heard();
    const echo = w.exploration.signal!.echo!;
    echo.worlds = 7;
    const worlds = farWorlds(w.seed, echo);
    w.exploration.signal!.surveyed = worlds.map(f => f.index);
    const gas = worlds.find(f => f.kind === 'gas');
    if (gas) expect(expeditionError(w, noKit(), gas.index)).toMatch(/gas giant/);
    const land = worlds.find(f => f.landable)!;
    launchExpedition(w, noKit(), land.index);
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(loaded.exploration.expedition?.target).toBe(land.index);
    expect(loaded.exploration.signal?.surveyed).toEqual(worlds.map(f => f.index));
    expect(baseView(w).signal!.expedition!.worlds.length).toBe(7);
  });
});

describe('a wreck on the way', () => {
  function findWreck(): WorldState {
    for (let seed = 1; seed < 400; seed++) {
      const w = heard(seed);
      w.exploration.signal!.echo!.hazard = 'calm';
      launchExpedition(w, noKit());
      const e = w.exploration.expedition!;
      for (let i = 0; i < 200 && !e.pending && e.phase === 'out'; i++) {
        w.system.time += 60;
        stepExpedition(w);
      }
      if (e.pending?.kind === 'find') return w;
    }
    throw new Error('no wreck found');
  }

  it('offers salvage or leave, and salvage adds time and usually metal', () => {
    const w = findWreck();
    expect(expeditionChoices(w).map(c => c.key)).toEqual(['salvage', 'leave']);
    expect(baseView(w).signal!.expedition!.trouble!.title).toMatch(/wreck/);
    const e = w.exploration.expedition!;
    const home = e.returnsAt;
    chooseExpedition(w, 'salvage');
    expect(e.returnsAt).toBe(home + SALVAGE.minutes * 60);
    expect(e.pending).toBeNull();
    expect((e.salvage ?? 0) > 0 || e.setbacks === 1).toBe(true);
  });

  it('is passed by if nobody answers, and salvage comes home in the depot', () => {
    const w = findWreck();
    const e = w.exploration.expedition!;
    w.system.time = e.pending!.deadline + 1;
    stepExpedition(w);
    expect(e.log.at(-1)).toMatch(/Passed a wreck/);
    e.salvage = 80;
    const iron = w.depot.iron;
    runOut(w, 'best');
    if (e.report!.result !== 'lost') expect(w.depot.iron).toBeGreaterThan(iron);
  });

  it('saves with a wreck waiting', () => {
    const w = findWreck();
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(loaded.exploration.expedition!.pending).toEqual(w.exploration.expedition!.pending);
  });
});
