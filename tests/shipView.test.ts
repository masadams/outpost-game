import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { SUIT } from '../src/sim/astronaut';
import { planetAt, surfacePosition } from '../src/sim/celestial';
import { shipPanelView } from '../src/ui/ship/shipView';

describe('ship panel view', () => {
  it('tells a fresh pilot how to mine and shows an empty hold', () => {
    const view = shipPanelView(createWorld());
    expect(view.cargo).toMatchObject({ value: '0', capacity: '120', fraction: 0, full: false });
    expect(view.next).toBe('Point at a rock and hold Space to mine, then hold C to pull the fragments in.');
    expect(view.ore.map(r => r.label)).toEqual(['Iron', 'Copper', 'Ice', 'Silicon', 'Rare metals']);
    expect(view.deposit).not.toBeNull();
    expect(view.deposit!.direction).toMatch(/^(Straight ahead|\d+° to your (left|right))$/);
    expect(view.foot).toBeNull();
  });

  it('points a loaded lander at the pad or the unload key', () => {
    const w = createWorld();
    w.ship.cargo.iron = 40;
    expect(shipPanelView(w).next).toBe('Press E to unload your ore.');
    w.ship.state = 'flying';
    w.ship.position.y -= 100;
    expect(shipPanelView(w).next).toBe('Ore on board. Land on the green pad.');
  });

  it('says a full hold is full, and delivered ore is delivered', () => {
    const w = createWorld();
    w.ship.cargo.iron = 120;
    expect(shipPanelView(w)).toMatchObject({ cargo: { full: true, fraction: 1 }, tools: 'Hold full. Return and unload.' });
    w.ship.cargo.iron = 0;
    w.depot.iron = 12;
    expect(shipPanelView(w).next).toBe('Delivered. Launch for more.');
  });

  it('describes the surroundings on foot without jargon', () => {
    const w = createWorld();
    w.playerMode = 'astronaut';
    w.astronaut.position = surfacePosition(planetAt('home', w.system), 0.01, SUIT.radius);
    const view = shipPanelView(w);
    expect(view.deposit).toBeNull();
    expect(view.foot!.status).toBe('Press F to board the lander.');
    expect(view.foot!.places.length).toBeGreaterThan(0);
    expect(JSON.stringify(view)).not.toMatch(/SUIT LOST|SURFACE OPERATIONS|unreserved/);
  });
});
