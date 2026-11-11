import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';
import { KEYSTONE_WORLDS } from '../src/sim/keystones';
import {
  ENDING_IDS, ENDINGS, SEED_SHIP, applySeedShipAction, SEED_STAGES, seedEnding, seedLaunchBlock, seedShipComplete, seedStageBlock, seedStagesDone,
  validSeedShip, type SeedStage,
} from '../src/sim/seedShip';
import { hasMemory, stepStory } from '../src/sim/story';
import { blueprintRevealed } from '../src/sim/unlocks';
import { seedShipView } from '../src/ui/base/baseView';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';

function yard() {
  const w = createWorld(4242);
  w.system.sun = true;
  w.asteroids = [];
  stepStory(w);
  w.colony.buildings.push(completedBuilding(1, 'storage', 0.1, w), completedBuilding(2, 'battery', 0.13, w), completedBuilding(3, 'shipyard', 0.2, w));
  w.colony.nextId = 10;
  w.colony.products = { alloy: 200, wire: 200, components: 200, water: 200, oxygen: 200, fuel: 200 };
  w.colony.energy = 1000;
  return w;
}
const build = (w: ReturnType<typeof yard>, stage: SeedStage) => applySeedShipAction(w, { type: 'seedStage', stage });
const allHome = (w: ReturnType<typeof yard>) => {
  w.exploration.keystones = Object.fromEntries(KEYSTONE_WORLDS.map(id => [id, 'home']));
};

describe('the seed ship', () => {
  it('needs a Shipyard, then the frame, then a part from each world', () => {
    const bare = createWorld(4242);
    expect(seedStageBlock(bare, 'frame')).toBe('Needs a Shipyard at home.');
    const w = yard();
    expect(seedStageBlock(w, 'frame')).toBeNull();
    expect(seedStageBlock(w, 'drive')).toBe('Lay the frame first.');
    build(w, 'frame');
    expect(seedStagesDone(w)).toEqual(['frame']);
    expect(seedStageBlock(w, 'drive')).toBe('Needs the Engine test records from Ember.');
    w.exploration.keystones = { ember: 'carried' };
    expect(seedStageBlock(w, 'drive')).toContain('aboard your lander');
  });

  it('spends the materials and power it says it costs', () => {
    const w = yard();
    const before = { ...w.colony.products };
    const energy = w.colony.energy;
    build(w, 'frame');
    expect(before.alloy - w.colony.products.alloy).toBe(SEED_SHIP.frame.cost.alloy);
    expect(before.wire - w.colony.products.wire).toBe(SEED_SHIP.frame.cost.wire);
    expect(energy - w.colony.energy).toBeGreaterThanOrEqual(SEED_SHIP.frame.energy);
  });

  it('says what is missing in plain words', () => {
    const w = yard();
    w.colony.products.alloy = 12;
    expect(seedStageBlock(w, 'frame')).toBe('Needs 60 alloy (you have 12).');
    build(w, 'frame');
    expect(seedStagesDone(w)).toEqual([]);
  });

  it('cannot be finished until every world has given up its part', () => {
    const w = yard();
    build(w, 'frame');
    w.exploration.keystones = Object.fromEntries(KEYSTONE_WORLDS.filter(id => id !== 'murk').map(id => [id, 'home']));
    for (const stage of SEED_STAGES) {
      w.colony.products = { alloy: 200, wire: 200, components: 200, water: 200, oxygen: 200, fuel: 200 };
      w.colony.energy = 1000;
      build(w, stage);
    }
    expect(seedStagesDone(w)).toHaveLength(7);
    expect(seedShipComplete(w)).toBe(false);
    expect(seedLaunchBlock(w)).toBe('The ship is not finished.');
    w.exploration.keystones.murk = 'home';
    w.colony.products = { alloy: 200, wire: 200, components: 200, water: 200, oxygen: 200, fuel: 200 };
    w.colony.energy = 1000;
    build(w, 'mind');
    expect(seedShipComplete(w)).toBe(true);
    stepStory(w);
    expect(hasMemory(w, 'shipDone')).toBe(true);
  });

  it('offers three endings once finished, takes one, and never a second', () => {
    const w = yard();
    allHome(w);
    for (const stage of SEED_STAGES) {
      w.colony.products = { alloy: 200, wire: 200, components: 200, water: 200, oxygen: 200, fuel: 200 };
      w.colony.energy = 1000;
      build(w, stage);
    }
    const view = seedShipView(w)!;
    expect(view.launch!.choices.map(c => c.id)).toEqual([...ENDING_IDS]);
    expect(view.launch!.chosen).toBeNull();
    applySeedShipAction(w, { type: 'seedLaunch', ending: 'colony' });
    expect(seedEnding(w)).toBe('colony');
    applySeedShipAction(w, { type: 'seedLaunch', ending: 'stay' });
    expect(seedEnding(w)).toBe('colony');
    expect(seedShipView(w)!.launch!.epilogue).toEqual(ENDINGS.colony.epilogue);
    stepStory(w);
    expect(hasMemory(w, 'decided')).toBe(true);
    // The game goes on afterwards and can be saved.
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(loaded.exploration.seedShip).toEqual(w.exploration.seedShip);
  });

  it('has an epilogue for every ending', () => {
    for (const id of ENDING_IDS) expect(ENDINGS[id].epilogue.length).toBeGreaterThanOrEqual(3);
  });

  it('brings the Shipyard blueprint back only once the relay is found', () => {
    const w = createWorld(4242);
    w.system.sun = true;
    stepStory(w);
    expect(blueprintRevealed(w, 'shipyard')).toBe(false);
    expect(seedShipView(w)).toBeNull();
    w.exploration.story!.memories.push('relay');
    expect(blueprintRevealed(w, 'shipyard')).toBe(true);
    expect(seedShipView(w)!.yard).toBe(false);
  });

  it('rejects bad saved data', () => {
    expect(validSeedShip({ stages: ['drive'] })).toBe(false);
    expect(validSeedShip({ stages: ['frame', 'frame'] })).toBe(false);
    expect(validSeedShip({ stages: ['frame'], ending: 'colony' })).toBe(false);
    expect(validSeedShip({ stages: [...SEED_STAGES], ending: 'home' })).toBe(true);
  });
});
