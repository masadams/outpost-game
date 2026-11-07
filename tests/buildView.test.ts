import { afterEach, describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { WORLD } from '../src/sim/config';
import { SUIT } from '../src/sim/astronaut';
import { planetAt, surfacePosition } from '../src/sim/celestial';
import { setFeatureMode, FOCUS_BLUEPRINTS } from '../src/preferences/features';
import { BUILD_TYPES } from '../src/sim/colonyConfig';
import { buildView, missingLine, placementTip, queueView } from '../src/ui/build/buildView';

afterEach(() => setFeatureMode(null));

function onFoot() {
  const w = createWorld();
  w.playerMode = 'astronaut';
  w.astronaut.position = surfacePosition(planetAt('home', w.system), 0, SUIT.radius);
  return w;
}

describe('build view', () => {
  it('starts with only solar and a refinery, and reveals the rest as earned', () => {
    setFeatureMode('focus');
    const w = createWorld();
    const kinds = () => {
      const first = buildView(w);
      if (!first.groups) return first.cards.map(c => c.kind);
      return first.groups.flatMap(g => buildView(w, g.id as never).cards.map(c => c.kind));
    };
    expect(buildView(w).groups).toBeNull();
    expect(kinds()).toEqual(['solar', 'refinery']);
    expect(buildView(w).cards[0]).toMatchObject({ label: 'Solar array', purpose: 'Makes power in sunlight', selected: true });
    w.objectives.completed.push('industry');
    expect(kinds()).toEqual(['solar', 'battery', 'storage', 'relay', 'miningRig', 'condenser', 'refinery', 'fuelProcessor', 'observatory']);
    w.system.sun = true;
    expect(kinds()).not.toContain('observatory');
    w.exploration.surveyed.push('frost');
    expect(kinds()).toContain('observatory');
    expect(kinds()).not.toContain('laser');
    w.colony.buildings.push({ id: 90, kind: 'observatory' } as never);
    expect(kinds()).toContain('laser');
  });


  it('shows group tabs and only that group with all features', () => {
    setFeatureMode('all');
    const view = buildView(createWorld(), 'defence');
    expect(view.groups!.find(g => g.active)!.id).toBe('defence');
    expect(view.cards.map(c => c.kind)).toContain('laser');
    expect(view.cards.map(c => c.kind)).not.toContain('solar');
  });

  it('builds from the landed ship or on foot, and says why not while flying or wrecked', () => {
    const landed = createWorld();
    expect(buildView(landed)).toMatchObject({ blocked: null, where: 'ship' });
    expect(buildView(landed).hint).toContain('Step out (F)');
    expect(buildView(onFoot())).toMatchObject({ blocked: null, where: 'foot' });

    const flying = createWorld();
    flying.ship.state = 'flying';
    flying.ship.position.y = -WORLD.radius - 200;
    expect(buildView(flying).blocked).toBe('Land or step out to build');

    const wreck = createWorld();
    wreck.ship.state = 'crashed';
    expect(buildView(wreck).blocked).toContain('Recover the lander');
  });

  it('names exactly what is missing', () => {
    const w = createWorld();
    for (const p of ['alloy', 'wire', 'components'] as const) w.colony.products[p] = 0;
    w.colony.products.alloy = 1;
    expect(missingLine(w, 'solar')).toBe('Needs 3 more alloy, 2 more wire, 1 more components');
    const solar = buildView(w).cards.find(c => c.kind === 'solar')!;
    expect(solar.cost.map(c => [c.product, c.need, c.short])).toEqual([
      ['alloy', 4, true],
      ['wire', 2, true],
      ['components', 1, true],
    ]);
    expect(placementTip(w, 'solar', 'Insufficient fabrication materials')).toEqual({
      text: 'Needs 3 more alloy, 2 more wire, 1 more components',
      ok: false,
    });
    expect(placementTip(w, 'solar', null)).toEqual({ text: 'Solar array · click to place', ok: true });
  });

  it('reports stocks, net power and queued work', () => {
    const w = createWorld();
    w.colony.generation = 4;
    w.colony.demand = 6;
    w.colony.command.queue.push({ id: 7, kind: 'refinery', angle: 0.1, progress: 2, paused: false, status: 'queued' });
    const view = buildView(w);
    expect(view.resources.find(r => r.key === 'power')).toMatchObject({ value: '−2.0 kW', level: 'bad' });
    expect(view.queue).toEqual([{ id: 7, label: 'Refinery', fraction: 0.25, status: 'queued', paused: false }]);
  });
});

describe('queue card', () => {
  it('is empty with no orders, says to step out from the ship, and offers Start on foot', () => {
    const w = createWorld();
    expect(queueView(w)).toBeNull();
    w.colony.command.queue.push({ id: 1, kind: 'solar', angle: 0.01, progress: 0, paused: false, status: 'queued' } as never);
    expect(queueView(w)?.start).toBe(false);
    expect(queueView(w)?.hint).toContain('(F)');
    w.playerMode = 'astronaut';
    expect(queueView(w)?.start).toBe(true);
  });
});

describe('placement tip for power links', () => {
  it('says how far the link stretches while placing in a day-cycle game', async () => {
    const { createWorld } = await import('../src/sim/world');
    const { placementTip } = await import('../src/ui/build/buildView');
    const w = createWorld();
    w.system.sun = true;
    const near = placementTip(w, 'relay', null, 400 / 1800);
    expect(near.text).toMatch(/wired to the pad, \d+ of 600 m/);
    expect(near.ok).toBe(true);
    const far = placementTip(w, 'relay', null, 900 / 1800);
    expect(far.text).toMatch(/too far/);
    expect(far.ok).toBe(false);
  });
});
