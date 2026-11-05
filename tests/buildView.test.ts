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
  it('offers the first-sortie buildings with hotkeys 1–5 in the focus set (the Observatory is mouse-only)', () => {
    setFeatureMode('focus');
    const view = buildView(createWorld());
    expect(view.groups).toBeNull();
    expect(view.cards.map(c => c.kind)).toEqual(BUILD_TYPES.filter(k => FOCUS_BLUEPRINTS.includes(k)));
    expect(view.cards.map(c => c.hotkey)).toEqual(['1', '2', '3', '4', '5', '7', null]);
    expect(view.cards[0]).toMatchObject({ label: 'Solar array', purpose: 'Makes power in sunlight', selected: true });
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
