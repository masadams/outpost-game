import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { planStorm, reportLine } from '../src/sim/storm';
import { STORM } from '../src/sim/stormConfig';
import { stormView } from '../src/ui/flight/stormView';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';

function through(seconds: number) {
  const w = createWorld();
  w.storm.armed = true;
  planStorm(w);
  w.system.time = STORM.arrivalTime - STORM.lead - 1;
  for (let i = 0; i < seconds * 60; i++) stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
  return w;
}

describe('storm summary', () => {
  it('counts what the storm did and shows it once the sky clears', () => {
    const w = through(STORM.lead + 61 + 400);
    expect(w.storm.phase).toBe('over');
    const r = w.storm.report!;
    expect(r.wave).toBe(1);
    expect(r.landed).toBe(w.defence.impacts);
    expect(r.stopped).toBe(w.defence.intercepted);
    expect(r.landed + r.stopped).toBeGreaterThan(0);
    // The summary survives a save.
    expect(decodeCheckpoint(encodeCheckpoint(w)).storm.report).toEqual(r);
    w.system.time = w.storm.endedAt + 5;
    const view = stormView(w)!;
    expect(view.tone).toBe('clear');
    expect(view.title).toBe('Storm 1 survived');
    expect(view.detail).toContain(`${r.landed} landed`);
    // It goes away by itself.
    w.system.time = w.storm.endedAt + 41;
    expect(stormView(w)).toBeNull();
  });

  it('reads plainly', () => {
    expect(reportLine({ wave: 2, stopped: 6, landed: 1, damaged: 1, lost: 0 }))
      .toBe('Storm 2 survived · 6 rocks stopped · 1 landed · 1 building damaged · no buildings lost');
    expect(reportLine({ wave: 3, stopped: 1, landed: 4, damaged: 0, lost: 2 }))
      .toBe('Storm 3 survived · 1 rock stopped · 4 landed · 2 buildings lost');
  });
});
