import { describe, expect, it } from 'vitest';
import { rockShape } from '../src/render/mining/rockShape';
import { sparkShower } from '../src/render/mining/laser';
import { VisualEffects } from '../src/render/effects';
import { createWorld } from '../src/sim/world';

const view = { centre: { x: 0, y: 0 }, radius: 1e6 };

describe('mining visuals', () => {
  it('gives a rock the same shape every time, and different rocks different shapes', () => {
    expect(rockShape(7)).toEqual(rockShape(7));
    expect(rockShape(7).outline).not.toEqual(rockShape(8).outline);
    expect(rockShape(7).outline.length).toBeGreaterThanOrEqual(10);
  });

  it('throws sparks back towards the ship, the same way for the same tick', () => {
    const sparks = sparkShower(3, { x: 1, y: 0 }, 9, 10);
    expect(sparks).toEqual(sparkShower(3, { x: 1, y: 0 }, 9, 10));
    expect(sparks).toHaveLength(9);
    for (const s of sparks) expect(s.to.x).toBeLessThanOrEqual(1e-9);
  });

  it('throws debris when a rock breaks, more for the first break, and caps it', () => {
    const w = createWorld();
    const fx = new VisualEffects();
    fx.reset(w);
    w.asteroids[0].stage = 0;
    w.ship.position = { ...w.asteroids[0].position };
    w.asteroids.splice(0, 1);
    fx.update(w, 1 / 60, false, 12, view);
    expect(fx.debris).toBe(8);
    expect(fx.count).toBeGreaterThan(0);
    fx.update(w, 1 / 60, false, 0, view);
    expect(fx.debris).toBe(0);
  });

  it('flashes and throws glints when ore comes aboard', () => {
    const w = createWorld();
    const fx = new VisualEffects();
    fx.reset(w);
    w.ship.cargo.iron += 1;
    fx.update(w, 1 / 60, false, 12, view);
    expect(fx.count).toBe(1);
    expect(fx.debris).toBe(3);
  });
});

describe('building effects', () => {
  const view = { centre: { x: 0, y: 0 }, radius: 1e6 };
  const site = (w: ReturnType<typeof createWorld>, kind: string, status = 'idle') => {
    w.colony.buildings.push({ id: w.colony.nextId++, kind, angle: 0.05, enabled: true, progress: 0, recipe: 0, status, health: 100 } as never);
    return w.colony.buildings[w.colony.buildings.length - 1];
  };

  it('flashes rings when a building is finished, but not for buildings that were already there', () => {
    const w = createWorld();
    site(w, 'solar');
    const fx = new VisualEffects();
    fx.reset(w);
    fx.update(w, 1 / 60, false, 12, view);
    expect(fx.rings).toBe(0);
    site(w, 'storage');
    fx.update(w, 1 / 60, false, 12, view);
    expect(fx.rings).toBe(1);
  });

  it('sends out a longer signal the first time the Observatory starts, and only that once', () => {
    const w = createWorld();
    const obs = site(w, 'observatory');
    const fx = new VisualEffects();
    fx.reset(w);
    obs.status = 'running';
    fx.update(w, 1 / 60, false, 12, view);
    expect(fx.rings).toBe(1);
    for (let i = 0; i < 60 * 4; i++) fx.update(w, 1 / 60, false, 12, view);
    expect(fx.rings).toBe(0);
    obs.status = 'no power';
    fx.update(w, 1 / 60, false, 12, view);
    obs.status = 'running';
    fx.update(w, 1 / 60, false, 12, view);
    expect(fx.rings).toBe(0);
  });

  it('shows nothing on reduced motion', () => {
    const w = createWorld();
    const fx = new VisualEffects();
    fx.reset(w);
    site(w, 'solar');
    fx.update(w, 1 / 60, false, 0, view);
    expect(fx.rings).toBe(0);
  });
});
