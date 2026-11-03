import { expect, it } from 'vitest';
import { decodeCheckpoint, encodeCheckpoint, readCheckpoint, writeCheckpoint, SAVE_KEY } from '../src/persistence/checkpoint';
import { createWorld } from '../src/sim/world';
import { stepColony } from '../src/sim/colony';
import { STEP, WORLD } from '../src/sim/config';

it('round-trips buildings, stock, machine progress, ship, crew and the finite field', () => {
  const world = createWorld(); world.colony.buildings = [
    { id: 1, kind: 'solar', angle: 0.2, enabled: true, progress: 0, recipe: 0, status: 'idle' },
    { id: 2, kind: 'fuelProcessor', angle: 0.3, enabled: true, progress: 0, recipe: 0, status: 'idle' },
  ]; world.colony.nextId = 3; world.asteroids.splice(0, 1); world.ship.cargo.iron = 5; world.ship.fuel = 150;
  for (let i = 0; i < 60; i++) stepColony(world, STEP);
  const loaded = decodeCheckpoint(encodeCheckpoint(world));
  expect(loaded.colony).toEqual(world.colony); expect(loaded.asteroids).toEqual(world.asteroids); expect(loaded.ship).toEqual(world.ship);
  for (let i = 0; i < 120; i++) { stepColony(world, STEP); stepColony(loaded, STEP); }
  expect(loaded.colony.products).toEqual(world.colony.products); expect(loaded.colony.products.fuel).toBe(1.25);
});
it('clears held controls on load and does not mutate the saved source world', () => {
  const world = createWorld(); world.buttons.board = true; world.astronaut.jumpHeld = true;
  const loaded = decodeCheckpoint(encodeCheckpoint(world));
  expect(loaded.buttons.board).toBe(false); expect(loaded.astronaut.jumpHeld).toBe(false); expect(world.buttons.board).toBe(true);
});
it.each(['{', JSON.stringify({ version: 999, world: createWorld() }), JSON.stringify({ version: 1, world: {} }), ' '.repeat(1_000_001)])('rejects broken, unsupported or oversized checkpoints', text => {
  expect(() => decodeCheckpoint(text)).toThrow();
});
it('rejects a newer envelope with an incompatible planet instead of silently moving the world', () => {
  const envelope = JSON.parse(encodeCheckpoint(createWorld())); envelope.environment.radius = 600;
  expect(() => decodeCheckpoint(JSON.stringify(envelope))).toThrow('incompatible');
});
it('rejects invalid building kinds, duplicate IDs, overflow and non-finite values', () => {
  const valid = JSON.parse(encodeCheckpoint(createWorld()));
  for (const modify of [
    (v: typeof valid) => { v.world.colony.selected = 'unknown'; },
    (v: typeof valid) => { v.world.colony.products.fuel = -1; },
    (v: typeof valid) => { v.world.ship.cargo.iron = 121; },
    (v: typeof valid) => { v.world.asteroids[1].id = v.world.asteroids[0].id; },
    (v: typeof valid) => { v.world.ship.position.x = null; },
  ]) {
    const candidate = structuredClone(valid); modify(candidate); expect(() => decodeCheckpoint(JSON.stringify(candidate))).toThrow();
  }
});
it('uses a versioned storage key, reports missing checkpoints and propagates unavailable storage safely', () => {
  const items = new Map<string, string>();
  const storage = { setItem: (key: string, text: string) => { items.set(key, text); }, getItem: (key: string) => items.get(key) ?? null };
  expect(readCheckpoint(storage)).toBeNull(); writeCheckpoint(storage, createWorld()); expect(items.has(SAVE_KEY)).toBe(true);
  expect(readCheckpoint(storage)?.colony.products.alloy).toBe(28);
  expect(() => writeCheckpoint({ setItem: () => { throw new Error('Quota exceeded'); } }, createWorld())).toThrow('Quota exceeded');
});

it.each([1, 7, 13, 14, 15, 17])('rejects incompatible development save version %i without migrating it', version => {
  const save = JSON.parse(encodeCheckpoint(createWorld())); save.version = version;
  expect(() => decodeCheckpoint(JSON.stringify(save))).toThrow('incompatible with this development build');
});
