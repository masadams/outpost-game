import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, type WorldState } from '../src/sim/world';
import { bodyExists, planetAt, surfacePosition, groundVelocity } from '../src/sim/celestial';
import { colonyWorld, activeWorld } from '../src/sim/localWorld';
import { transferFreight, loadDepotOre } from '../src/sim/freight';
import { boardOrExit } from '../src/sim/surface';
import { applyColonyAction, placementError } from '../src/sim/colony';
import { WORLD } from '../src/sim/config';
import { TECH_IDS } from '../src/sim/progressionConfig';
import { encodeCheckpoint, decodeCheckpoint } from '../src/persistence/checkpoint';
import { baseView } from '../src/ui/base/baseView';
import { supplyWorlds } from '../src/sim/supply';
import { podError } from '../src/sim/pods';
import { onWater } from '../src/sim/nature';
import { applyCommandAction } from '../src/sim/command';

const IDLE = { thrust: false, turn: 0 };
const run = (w: WorldState, seconds: number) => { for (let i = 0; i < seconds * 60; i++) stepWorld(w, IDLE, 1 / 60); };

/** A seeded game with the lander parked on a new world's pad, freight aboard and the world already found. */
function parkedOn(body: 'verdant' | 'tide' | 'murk'): WorldState {
  let seed = 1;
  while (!bodyExists(body, { time: 0, binary: true, seed })) seed++;
  const w = createWorld(seed);
  w.system.sun = true;
  w.asteroids = [];
  w.exploration.known.push(body);
  w.objectives.completed.push('delivery', 'industry');
  w.colony.research.completed.push(...TECH_IDS);
  w.ship.freight = { ...w.ship.freight, alloy: 40, wire: 20, components: 10 };
  const p = planetAt(body, w.system);
  w.ship.position = surfacePosition(p, 0, WORLD.shipRadius + 1);
  w.ship.velocity = groundVelocity(p, w.ship.position);
  w.ship.angle = p.spin;
  w.ship.state = 'flying';
  for (let i = 0; i < 600 && w.ship.state === 'flying'; i++) stepWorld(w, IDLE, 1 / 60);
  return w;
}

describe('a base on a new world', () => {
  for (const body of ['verdant', 'tide', 'murk'] as const) {
    it(`builds on ${body}: power and a rig on a seam fill that world's own depot`, () => {
      const w = parkedOn(body);
      expect(w.ship.state).toBe('landed');
      expect(w.ship.ground).toBe(body);
      expect(activeWorld(w).siteBody).toBe(body);
      const site = colonyWorld(w, body);
      // Unload the building materials from the freight bay into this world's stores.
      for (let i = 0; i < 4; i++) transferFreight(site, 'alloy', -5);
      for (let i = 0; i < 2; i++) transferFreight(site, 'wire', -5);
      transferFreight(site, 'components', -5);
      expect(site.colony.products.alloy).toBe(20);
      expect(w.colony.products.alloy).toBe(28);
      // Step out and build.
      boardOrExit(site);
      expect(w.playerMode).toBe('astronaut');
      const seam = site.surfaceDeposits.filter(d => !onWater(body, w.seed, d.angle)).sort((a, b) => Math.abs(a.angle) - Math.abs(b.angle))[0];
      expect(seam).toBeTruthy();
      const rig = placementError(site, 'miningRig', seam.angle, { remote: true });
      expect(rig).toBeNull();
      site.colony.selected = 'miningRig';
      site.colony.buildOpen = true;
      const before = site.colony.buildings.length;
      // Place remotely (as the build bar does from the landed ship) at the seam, and solar next to the pad.
      applyColonyAction(site, { type: 'buildMode', open: true });
      for (const [kind, angle] of [['solar', 0.12], ['miningRig', seam.angle]] as const) {
        const err = placementError(site, kind, angle, { remote: true });
        expect(err).toBeNull();
      }
      site.colony.buildings.push(
        { id: 5001, kind: 'solar', angle: 0.12, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
        { id: 5002, kind: 'miningRig', angle: seam.angle, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100, depositId: seam.id },
      );
      site.colony.nextId = 5003;
      expect(site.colony.buildings.length).toBe(before + 2);
      expect(w.colony.buildings.some(b => b.id === 5001)).toBe(false);
      run(w, 120);
      const ore = site.depot[seam.resource];
      expect(ore).toBeGreaterThan(0);
      expect(w.depot[seam.resource]).toBe(0);
      // The ore can be loaded into the lander there and the game still saves and loads.
      boardOrExit(site);
      loadDepotOre(site, seam.resource);
      expect(w.ship.cargo[seam.resource]).toBeGreaterThan(0);
      const loaded = decodeCheckpoint(encodeCheckpoint(w));
      expect(loaded.outposts[body].colony.buildings.map(b => b.kind)).toEqual(expect.arrayContaining(['solar', 'miningRig']));
      // The rest of the game sees the new base: Base lists it, supply lines and pods can reach it.
      const view = baseView(site);
      expect(JSON.stringify(view)).toContain(body === 'verdant' ? 'Verdant' : body === 'tide' ? 'Tide' : 'Murk');
      expect(supplyWorlds(w)).toContain(body);
      expect(podError(w, 'home', body)).not.toBe('Unknown world.');
    });
  }

  it('builds on Verdant the normal way: a queued site is paid for and the crew builds it', () => {
    const w = parkedOn('verdant');
    const site = colonyWorld(w, 'verdant');
    for (let i = 0; i < 4; i++) transferFreight(site, 'alloy', -5);
    for (let i = 0; i < 2; i++) transferFreight(site, 'wire', -5);
    transferFreight(site, 'components', -5);
    applyCommandAction(site, { type: 'queueBuild', kind: 'solar', angle: 60 / 520 });
    expect(site.colony.command.queue.length + site.colony.buildings.length).toBeGreaterThan(0);
    boardOrExit(site);
    run(w, 60);
    expect(site.colony.buildings.some(b => b.kind === 'solar')).toBe(true);
    expect(w.colony.buildings.some(b => b.kind === 'solar')).toBe(false);
    expect(site.colony.products.alloy).toBeLessThan(20);
  });
});
