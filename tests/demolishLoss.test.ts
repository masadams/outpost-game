import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';
import { demolishBuilding, demolishError, demolishLoss, oreCapacity, productCapacity } from '../src/sim/colony';
import { inventoryMass } from '../src/sim/resources';
import { encodeCheckpoint } from '../src/persistence/checkpoint';

function base() {
  const w = createWorld();
  w.asteroids = [];
  w.colony.buildings = [completedBuilding(1, 'storage', 0.1, w), completedBuilding(2, 'solar', 0.14, w)];
  w.colony.nextId = 5;
  return w;
}

describe('demolishing with full stores', () => {
  it('is never blocked for lack of storage', () => {
    const w = base();
    w.colony.products.alloy = productCapacity(w.colony);
    w.depot.iron = oreCapacity(w.colony);
    expect(demolishError(w, w.colony.buildings[0])).toBeNull();
  });

  it('warns what will be lost, and says nothing when there is room', () => {
    const w = base();
    expect(demolishLoss(w, w.colony.buildings[0])).toBeNull();
    w.colony.products.alloy = 180;
    w.depot.iron = 550;
    const warning = demolishLoss(w, w.colony.buildings[0])!;
    expect(warning).toContain('Not enough storage without it');
    expect(warning).toMatch(/\d+ alloy/);
    expect(warning).toContain('150 kg of ore');
    // A solar array holds nothing, so taking it down loses nothing.
    expect(demolishLoss(w, w.colony.buildings[1])).toBeNull();
  });

  it('loses exactly the overflow, keeps the rest, and the game still saves', () => {
    const w = base();
    w.colony.products.alloy = 180;
    w.depot.iron = 400;
    w.depot.copper = 150;
    demolishBuilding(w, w.colony.buildings[0]);
    expect(w.colony.products.alloy).toBeCloseTo(productCapacity(w.colony), 6);
    expect(inventoryMass(w.depot)).toBeCloseTo(oreCapacity(w.colony), 6);
    // Both ores shrink by the same share.
    expect(w.depot.iron / w.depot.copper).toBeCloseTo(400 / 150, 6);
    expect(w.notice.message).toContain('lost');
    expect(() => encodeCheckpoint(w)).not.toThrow();
  });
});
