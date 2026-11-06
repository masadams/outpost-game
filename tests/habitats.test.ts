import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { applyColonyAction, placementError, stepColony, type Building } from '../src/sim/colony';
import { createHabitat, HABITAT, HABITATS } from '../src/sim/habitatConfig';
import { consumeHabitatAir, habitatContains, habitatSource, stepHabitats } from '../src/sim/habitats';
import { damageColony, repairBuilding } from '../src/sim/buildingDamage';
import { heading } from '../src/sim/math';
import { SUIT, stepAstronaut } from '../src/sim/astronaut';
import { STEP, WORLD } from '../src/sim/config';
import { FixedClock } from '../src/sim/clock';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';
import { AudioDirector } from '../src/audio/director';
function fixture() {
  const w = createWorld(); w.playerMode = 'astronaut'; w.asteroids = [];
  const b: Building = { id: 1, kind: 'habitatSmall', angle: 0, health: 100, enabled: true, progress: 0, recipe: 0, status: 'breathable', habitat: { ...createHabitat(), oxygen: 1, energy: 20, powered: true } };
  w.colony.buildings = [b]; w.colony.nextId = 2; w.colony.products.oxygen = 0;
  return { w, b, h: b.habitat! };
}
const position = (arc: number, height: number = SUIT.radius) => { const n = heading(arc / WORLD.radius); return { x: n.x * (WORLD.radius + height), y: n.y * (WORLD.radius + height) }; };
describe('oxygen habitats', () => {
  it('charges construction materials and creates empty buffers; large legs can span the home pad', () => {
    const w = createWorld(); w.playerMode = 'astronaut'; w.colony.buildOpen = true; w.colony.offset = 0; w.colony.selected = 'habitatLarge';
    expect(placementError(w)).toBeNull(); applyColonyAction(w, { type: 'place' });
    expect(w.colony.buildings[0].habitat).toEqual(createHabitat()); expect(w.colony.products).toMatchObject({ alloy: 12, wire: 8, components: 4, oxygen: 2 });
  });
  it('excludes pad, terminal and facility foundations in both placement directions', () => {
    const { w, b } = fixture(); expect(placementError(w, 'habitatSmall', 0)).toMatch(/pad/);
    w.colony.buildings = []; w.astronaut.position = position(74);
    expect(placementError(w, 'habitatSmall', 74 / WORLD.radius)).toMatch(/terminals/);
    b.angle = 200 / WORLD.radius; w.colony.buildings = [b]; w.astronaut.position = position(180);
    expect(placementError(w, 'solar', 180 / WORLD.radius)).toMatch(/overlap/);
    w.colony.buildings = [{ ...b, kind: 'solar', angle: 180 / WORLD.radius, habitat: undefined }];
    expect(placementError(w, 'habitatSmall', 200 / WORLD.radius)).toMatch(/overlap/);
    expect(placementError(w, 'habitatLarge', 180 / WORLD.radius)).toBeNull();
  });
  it('requires the whole suit under the curved elliptical roof, including across angle wrap', () => {
    const { b } = fixture(); expect(habitatContains(b, position(0))).toBe(true);
    expect(habitatContains(b, position(18))).toBe(false); expect(habitatContains(b, position(0, 18))).toBe(false);
    b.angle = Math.PI; expect(habitatContains(b, position(-Math.PI * WORLD.radius))).toBe(true);
  });
  it('draws real oxygen and power, and charges only paid backup energy', () => {
    const { w, h } = fixture(); h.oxygen = 0; h.energy = 0; w.colony.products.oxygen = 2; w.colony.energy = 10;
    stepHabitats(w, 1); expect(h.oxygen).toBeCloseTo(.2); expect(w.colony.products.oxygen).toBeCloseTo(1.8);
    expect(h.energy).toBe(2); expect(w.colony.energy).toBe(6); expect(h.powered).toBe(true);
  });
  it('consumes finite backup for ten seconds then switches to suit without granting another grace period', () => {
    const { w, h } = fixture(); for (let i = 0; i < 600; i++) stepHabitats(w, STEP);
    expect(h.energy).toBeCloseTo(0); stepHabitats(w, STEP); expect(h.powered).toBe(false);
    const air = w.astronaut.oxygen; stepWorld(w, { thrust: false, turn: 0 }, STEP); expect(w.astronaut.oxygen).toBeCloseTo(air - STEP);
    for (let i = 0; i < 60; i++) stepHabitats(w, STEP); expect(h.powered).toBe(false);
  });
  it('uses reserved grid energy for life support but not backup charging', () => {
    const { w, h } = fixture(); h.energy = 0; w.colony.energy = 10; w.colony.policy = { energyReserve: 10, deliveryReserve: 0, alloyReserve: 0, componentsReserve: 0 };
    stepHabitats(w, 1); expect(h.powered).toBe(true); expect(h.energy).toBe(0); expect(w.colony.energy).toBe(8);
  });
  it('pays only one oxygen source when habitats overlap', () => {
    const { w, b, h } = fixture(); const other = { ...b, id: 2, habitat: { ...h } }; w.colony.buildings = [other, b]; w.colony.nextId = 3;
    expect(consumeHabitatAir(w, 1)).toBeCloseTo(1); expect(h.oxygen).toBeCloseTo(1 - HABITAT.crewRate); expect(other.habitat.oxygen).toBe(1);
    expect(w.colony.oxygenUsed).toBeCloseTo(HABITAT.crewRate);
  });
  it('covers fractional air then draws the remaining step from the suit', () => {
    const { w, h } = fixture(); h.oxygen = .15 + HABITAT.crewRate * .25;
    stepAstronaut(w.astronaut, { move: 0, jump: false }, 1, consumeHabitatAir(w, 1));
    expect(h.oxygen).toBeCloseTo(.15); expect(w.astronaut.oxygen).toBeCloseTo(SUIT.oxygen - .75); expect(habitatSource(w)).toBeUndefined();
  });
  it('holds an empty suit alive without refilling or healing, and never revives a dead crew member', () => {
    const { w } = fixture(); w.astronaut.oxygen = 0; w.astronaut.health = 42;
    stepWorld(w, { thrust: false, turn: 0 }, STEP); expect(w.astronaut.health).toBe(42); expect(w.astronaut.oxygen).toBe(0);
    w.astronaut.health = 0; expect(consumeHabitatAir(w, 1)).toBe(0); stepWorld(w, { thrust: false, turn: 0 }, STEP); expect(w.astronaut.health).toBe(0);
  });
  it('keeps leaking while disabled, with a higher rate through damaged seals', () => {
    const { w, b, h } = fixture(); b.enabled = false; b.health = 50; stepHabitats(w, 1);
    expect(h.oxygen).toBeCloseTo(1 - HABITATS.habitatSmall.leakRate * 3); expect(w.colony.oxygenUsed).toBeCloseTo(.006); expect(h.powered).toBe(false);
  });
  it('vents gas and backup immediately on destruction and repairs never restore either', () => {
    const { w, b, h } = fixture(); damageColony(w, position(0, 0), 100, 10); expect(b.health).toBe(0);
    expect(h).toEqual(createHabitat()); expect(w.colony.oxygenUsed).toBeCloseTo(1);
    w.astronaut.health = 100; repairBuilding(w); expect(b.health).toBe(100); expect(h.oxygen).toBe(0); expect(h.energy).toBe(0);
  });
  it('demolition vents air once and never refunds oxygen', () => {
    const { w } = fixture(); w.colony.buildOpen = true; applyColonyAction(w, { type: 'demolish' });
    expect(w.colony.buildings).toHaveLength(0); expect(w.colony.oxygenUsed).toBe(1); expect(w.colony.products.oxygen).toBe(0);
    applyColonyAction(w, { type: 'demolish' }); expect(w.colony.oxygenUsed).toBe(1);
  });
  it('processes real ice into refill oxygen and conserves stored, buffered and spent gas', () => {
    const { w, b, h } = fixture(); h.oxygen = 0; h.energy = 0; w.depot.ice = 2;
    w.colony.buildings.push({ ...b, id: 2, kind: 'solar', habitat: undefined }, { ...b, id: 3, kind: 'refinery', recipe: 3, habitat: undefined }); w.colony.nextId = 4;
    for (let i = 0; i < 600; i++) stepWorld(w, { thrust: false, turn: 0 }, STEP);
    expect(w.depot.ice).toBe(0); expect(h.oxygen).toBeGreaterThan(.15);
    expect(w.colony.products.oxygen + h.oxygen + w.colony.oxygenUsed).toBeCloseTo(.6, 8);
  });
  it('funds the second habitat before charging the first backup', () => {
    const { w, b, h } = fixture(); h.energy = 0; w.colony.energy = 4;
    const other = { ...b, id: 2, habitat: { ...h } }; w.colony.buildings.push(other); w.colony.nextId = 3;
    stepHabitats(w, 1); expect(h.powered).toBe(true); expect(other.habitat.powered).toBe(true);
    expect(h.energy).toBe(0); expect(other.habitat.energy).toBe(0); expect(w.colony.energy).toBe(0);
  });
  it('leaves falling and blast damage active inside a breathable habitat', () => {
    const { w } = fixture(); w.astronaut.grounded = false; w.astronaut.position = position(0, 8); w.astronaut.velocity = { x: 0, y: 25 };
    for (let i = 0; i < 30; i++) stepWorld(w, { thrust: false, turn: 0 }, STEP);
    expect(w.astronaut.health).toBeLessThan(100); expect(w.astronaut.grounded).toBe(true);
    const before = w.astronaut.health; damageColony(w, position(0, 0), 10, 20); expect(w.astronaut.health).toBeLessThan(before);
  });
  it('round trips habitat gas, backup, usage and other equipment through the current format', () => {
    const { w, h } = fixture(); h.energy = 7; w.colony.oxygenUsed = 3; w.ship.towRig = true;
    const text = encodeCheckpoint(w); expect(JSON.parse(text).version).toBe(22); const loaded = decodeCheckpoint(text);
    expect(loaded.colony.buildings[0].habitat).toEqual(h); expect(loaded.colony.oxygenUsed).toBe(3); expect(loaded.ship.towRig).toBe(true);
  });
  it.each(['oxygen', 'energy'] as const)('rejects invalid %s buffers', field => {
    const { w, h } = fixture(); const save = JSON.parse(encodeCheckpoint(w)); save.world.colony.buildings[0].habitat[field] = 999;
    expect(() => decodeCheckpoint(JSON.stringify(save))).toThrow(); h[field] = -1; expect(() => encodeCheckpoint(w)).toThrow();
  });
  it('holds the suit inside a dome and resumes depletion after walking out at any frame rate', () => {
    const run = (hz: number) => { const { w } = fixture(), clock = new FixedClock(); for (let i = 0; i < hz * 5; i++) clock.advance(1 / hz, dt => stepWorld(w, { thrust: false, turn: 1 }, dt)); return w; };
    const w = run(30); expect(w).toEqual(run(144)); expect(w.astronaut.oxygen).toBeLessThan(SUIT.oxygen - 2); expect(w.astronaut.oxygen).toBeGreaterThan(SUIT.oxygen - 5);
  });
  it('suppresses low suit air alarms under habitat air and warns again after failure', () => {
    const { w, b } = fixture(); w.astronaut.oxygen = 10; const audio = new AudioDirector(); audio.reset(w);
    expect(audio.update(w, 1, false).cues).not.toContain('warning'); b.enabled = false;
    expect(audio.update(w, 1, false).cues).toEqual(expect.arrayContaining(['airlock', 'warning']));
    expect(audio.update(w, 1, true).cues).toEqual([]);
  });
});
