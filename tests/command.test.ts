import { describe, expect, it } from 'vitest';
import { applyCommandAction } from '../src/sim/command';
import { createWorld, stepWorld } from '../src/sim/world';
import { createCommand } from '../src/sim/commandConfig';
import { stepColony, placementError, type Building } from '../src/sim/colony';
import { orderedBuildings } from '../src/sim/power';
import { createHabitat } from '../src/sim/habitatConfig';
import { stationPosition } from '../src/sim/stations';
import { SUIT } from '../src/sim/astronaut';
import { STEP, WORLD } from '../src/sim/config';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';
import { FixedClock } from '../src/sim/clock';
function fixture() {
  const w = createWorld(); w.asteroids = [];
  const make = (id: number, kind: Building['kind'], arc: number): Building => ({ id, kind, angle: arc / WORLD.radius, enabled: true, health: 100, progress: 0, recipe: 0, status: 'idle' });
  w.colony.buildings = [make(1, 'solar', 120), make(2, 'refinery', 160), make(3, 'refinery', 200)]; w.colony.nextId = 4; w.depot.iron = 20;
  return w;
}
const run = (w: ReturnType<typeof createWorld>, seconds: number) => { for (let i = 0; i < Math.round(seconds / STEP); i++) stepColony(w, STEP); };
function worker(w: ReturnType<typeof createWorld>, arc = 120) { w.playerMode = 'astronaut'; w.astronaut.position = stationPosition(arc / WORLD.radius); w.astronaut.velocity = { x: 0, y: 0 }; w.astronaut.grounded = true; }
describe('central command operations and power', () => {
  it('remotely toggles and selects recipes from the ship without moving the astronaut', () => {
    const w = fixture(), at = { ...w.astronaut.position }; applyCommandAction(w, { type: 'remote', id: 2, operation: 'toggle' });
    expect(w.colony.buildings[1].enabled).toBe(false); applyCommandAction(w, { type: 'remote', id: 2, operation: 'recipe' });
    expect(w.colony.buildings[1].recipe).toBe(1); expect(w.astronaut.position).toEqual(at); expect(w.playerMode).toBe('ship');
  });
  it('shares existing scheduling/target bounds and never repairs a wreck for free', () => {
    const w = fixture(), b = w.colony.buildings[1]; applyCommandAction(w, { type: 'remote', id: 2, operation: 'schedule' });
    applyCommandAction(w, { type: 'remoteTarget', id: 2, product: 'alloy', delta: 5 }); expect(b.schedule?.enabled).toBe(true);
    const goal = b.schedule!.targets.alloy; applyCommandAction(w, { type: 'remoteTarget', id: 2, product: 'invalid', delta: 500 }); expect(b.schedule!.targets.alloy).toBe(goal);
    b.health = 0; applyCommandAction(w, { type: 'remote', id: 2, operation: 'toggle' }); expect(b.health).toBe(0);
  });
  it('slows production in proportion to paid power and holds progress at a zero cap', () => {
    const w = fixture(); w.colony.buildings.pop(); applyCommandAction(w, { type: 'powerLimit', id: 2, percent: 50 }); const alloy = w.colony.products.alloy;
    run(w, 2); expect(w.colony.products.alloy).toBe(alloy); expect(w.colony.buildings[1].progress).toBeCloseTo(1); expect(w.colony.buildings[1].gridPower).toBe(2);
    applyCommandAction(w, { type: 'powerLimit', id: 2, percent: 0 }); run(w, 2); expect(w.colony.buildings[1].progress).toBeCloseTo(1);
    applyCommandAction(w, { type: 'powerLimit', id: 2, percent: 50 }); run(w, 2); expect(w.colony.products.alloy).toBe(alloy + 1); expect(w.depot.iron).toBe(19);
  });
  it('derates solar without increasing grid energy', () => {
    const w = fixture(); w.colony.buildings.splice(1); applyCommandAction(w, { type: 'powerLimit', id: 1, percent: 50 }); run(w, 1);
    expect(w.colony.generation).toBe(4); expect(w.colony.energy).toBeCloseTo(4); applyCommandAction(w, { type: 'powerLimit', id: 1, percent: 101 }); expect(w.colony.buildings[0].dispatch?.limit).toBe(50);
  });
  it('reorders scarce continuous power deterministically and retains batch work', () => {
    const w = fixture(); applyCommandAction(w, { type: 'powerLimit', id: 1, percent: 50 }); run(w, 1);
    expect(w.colony.buildings[1].progress).toBeCloseTo(1); expect(w.colony.buildings[2].progress).toBe(0);
    applyCommandAction(w, { type: 'priority', id: 3, before: 2 }); run(w, 1);
    expect(w.colony.buildings[1].progress).toBeCloseTo(1); expect(w.colony.buildings[2].progress).toBeCloseTo(1);
    expect(orderedBuildings(w.colony).map(b => b.id)).toEqual([1, 3, 2]);
  });
  it('applies habitat grid caps using finite backup rather than partial free life support', () => {
    const w = fixture(); w.colony.buildings.splice(1); const b = { ...w.colony.buildings[0], id: 2, kind: 'habitatSmall' as const, habitat: { ...createHabitat(), oxygen: 1, energy: 2, powered: true } }; w.colony.buildings.push(b); w.colony.nextId = 3;
    applyCommandAction(w, { type: 'powerLimit', id: 2, percent: 0 }); run(w, 2);
    expect(b.habitat.energy).toBeCloseTo(0); expect(b.habitat.powered).toBe(false); expect(b.gridPower).toBe(0);
  });
  it('toggles remote automatic turrets while preserving paid shots and disallows remote steering', () => {
    const w = fixture(); w.colony.buildings[1].kind = 'laser'; applyCommandAction(w, { type: 'remote', id: 2, operation: 'auto' });
    expect(w.colony.buildings[1].turret?.automatic).toBe(true); expect(w.defence.controlled).toBeNull(); expect(w.defence.shots).toBe(0);
  });
  it('remote service cannot heal a distant crew member or teleport a ship', () => {
    const w = fixture(), b = w.colony.buildings[1]; b.kind = 'service'; worker(w, 500); w.astronaut.health = 40; w.astronaut.oxygen = 20; w.colony.energy = 10;
    applyCommandAction(w, { type: 'remote', id: b.id, operation: 'service' }); expect(w.colony.energy).toBe(10); expect(w.astronaut.health).toBe(40);
    b.angle = 0; applyCommandAction(w, { type: 'remote', id: b.id, operation: 'service' }); expect(w.colony.energy).toBe(8); expect(w.astronaut.health).toBe(40); expect(w.astronaut.oxygen).toBe(20);
  });
});
describe('supplied construction queue', () => {
  it('commits costs, waits for actual crew work, then creates exactly one facility', () => {
    const w = createWorld(); applyCommandAction(w, { type: 'queueBuild', kind: 'solar', angle: 120 / WORLD.radius }); expect(w.colony.products.alloy).toBe(24);
    run(w, 10); expect(w.colony.buildings).toHaveLength(0); expect(w.colony.command.queue[0].progress).toBe(0);
    worker(w); run(w, 7); expect(w.colony.buildings).toHaveLength(0); run(w, 1); expect(w.colony.buildings).toHaveLength(1); expect(w.colony.products.alloy).toBe(24); run(w, 10); expect(w.colony.buildings).toHaveLength(1);
  });
  it('reserves future footprints against other orders and instant local construction', () => {
    const w = createWorld(); const action = { type: 'queueBuild' as const, kind: 'solar' as const, angle: 120 / WORLD.radius }; applyCommandAction(w, action); applyCommandAction(w, action);
    expect(w.colony.command.queue).toHaveLength(1); worker(w); expect(placementError(w, 'refinery', action.angle)).toMatch(/overlap/); expect(w.colony.products.alloy).toBe(24);
  });
  it('rejects blocked, invalid or unaffordable sites without charging', () => {
    const w = createWorld(); for (const angle of [0, NaN, 99]) applyCommandAction(w, { type: 'queueBuild', kind: 'solar', angle });
    expect(w.colony.command.queue).toHaveLength(0); expect(w.colony.products.alloy).toBe(28); w.colony.products.alloy = 0;
    applyCommandAction(w, { type: 'queueBuild', kind: 'solar', angle: .2 }); expect(w.colony.command.queue).toHaveLength(0);
  });
  it('pauses work when crew moves, jumps, dies or leaves the site', () => {
    const w = createWorld(); applyCommandAction(w, { type: 'queueBuild', kind: 'solar', angle: 120 / WORLD.radius }); worker(w); run(w, 1);
    w.astronaut.velocity.x = 1; run(w, 1); w.astronaut.velocity.x = 0; w.astronaut.grounded = false; run(w, 1); worker(w, 500); run(w, 1); worker(w); w.astronaut.health = 0; run(w, 1);
    expect(w.colony.command.queue[0].progress).toBeCloseTo(1);
  });
  it('pause yields the worker to the next order and cancellation refunds only unworked escrow once', () => {
    const w = createWorld(); applyCommandAction(w, { type: 'queueBuild', kind: 'solar', angle: 120 / WORLD.radius }); applyCommandAction(w, { type: 'queueBuild', kind: 'battery', angle: 160 / WORLD.radius }); worker(w); run(w, 4);
    applyCommandAction(w, { type: 'queueControl', id: 1, operation: 'pause' }); run(w, 2); expect(w.colony.command.queue[1].progress).toBeCloseTo(2);
    applyCommandAction(w, { type: 'queueControl', id: 1, operation: 'cancel' }); expect(w.colony.products.alloy).toBeCloseTo(22);
    applyCommandAction(w, { type: 'queueControl', id: 1, operation: 'cancel' }); expect(w.colony.products.alloy).toBeCloseTo(22);
  });
  it('blocks refunds that would overflow storage until there is room', () => {
    const w = createWorld(); applyCommandAction(w, { type: 'queueBuild', kind: 'solar', angle: .2 }); w.colony.products.alloy = 100;
    applyCommandAction(w, { type: 'queueControl', id: 1, operation: 'cancel' }); expect(w.colony.command.queue).toHaveLength(1); w.colony.products.alloy = 96;
    applyCommandAction(w, { type: 'queueControl', id: 1, operation: 'cancel' }); expect(w.colony.products.alloy).toBe(100); expect(w.colony.command.queue).toHaveLength(0);
  });
  it('construction respects held turret materials and never grants gas with a new dome', () => {
    const w = createWorld(); w.colony.policy = { energyReserve: 0, deliveryReserve: 0, alloyReserve: 28, componentsReserve: 0 };
    applyCommandAction(w, { type: 'queueBuild', kind: 'habitatLarge', angle: 0 }); expect(w.colony.command.queue).toHaveLength(0);
    w.colony.policy.alloyReserve = 0; applyCommandAction(w, { type: 'queueBuild', kind: 'habitatLarge', angle: 0 }); worker(w, 0); run(w, 8);
    expect(w.colony.buildings[0].habitat?.oxygen).toBe(0); expect(w.colony.products.oxygen).toBe(2);
  });
  it('revalidates finite mining seams before completing a paid order', () => {
    const w = createWorld(), seam = w.surfaceDeposits[0];
    applyCommandAction(w, { type: 'queueBuild', kind: 'miningRig', angle: seam.angle }); expect(w.colony.command.queue).toHaveLength(1);
    seam.remaining = 0; worker(w, seam.angle * WORLD.radius); run(w, 10); expect(w.colony.buildings).toHaveLength(0); expect(w.colony.command.queue[0].status).toMatch(/exhausted/);
  });
  it('appends new construction after surviving priorities even when demolition leaves rank gaps', () => {
    const w = fixture(); applyCommandAction(w, { type: 'priority', id: 3, before: 2 });
    w.colony.buildings = w.colony.buildings.filter(b => b.id === 2);
    applyCommandAction(w, { type: 'queueBuild', kind: 'solar', angle: 300 / WORLD.radius }); worker(w, 300); run(w, 8);
    expect(orderedBuildings(w.colony).map(b => b.id)).toEqual([2, 4]);
    expect(() => encodeCheckpoint(w)).not.toThrow();
  });
  it('preserves priorities, budgets, paid work and legacy progress with version 10 migration', () => {
    const w = fixture(); applyCommandAction(w, { type: 'powerLimit', id: 2, percent: 30 }); applyCommandAction(w, { type: 'queueBuild', kind: 'solar', angle: .3 }); worker(w, 500); run(w, 2);
    const text = encodeCheckpoint(w); expect(JSON.parse(text).version).toBe(11); const loaded = decodeCheckpoint(text); expect(loaded.colony).toEqual(w.colony);
    const old = JSON.parse(text); old.version = 9; delete old.world.colony.command; const migrated = decodeCheckpoint(JSON.stringify(old)); expect(migrated.colony.command).toEqual(createCommand()); expect(migrated.depot).toEqual(w.depot);
  });
  it('rejects malformed priorities, limits, duplicate orders and invalid paid progress', () => {
    const w = fixture(); applyCommandAction(w, { type: 'queueBuild', kind: 'solar', angle: .3 }); const text = encodeCheckpoint(w);
    for (const mutate of [(x: any) => x.world.colony.buildings[0].dispatch = { rank: 0, limit: 101 }, (x: any) => x.world.colony.command.queue[0].progress = 9, (x: any) => x.world.colony.command.queue.push(x.world.colony.command.queue[0])]) {
      const saved = JSON.parse(text); mutate(saved); expect(() => decodeCheckpoint(JSON.stringify(saved))).toThrow();
    }
  });
  it('completes identically at 30 and 144 Hz through the fixed clock', () => {
    const execute = (hz: number) => { const w = createWorld(), clock = new FixedClock(); w.asteroids = []; worker(w); applyCommandAction(w, { type: 'queueBuild', kind: 'solar', angle: 120 / WORLD.radius }); for (let i = 0; i < hz * 10; i++) clock.advance(1 / hz, dt => stepWorld(w, { turn: 0, thrust: false }, dt)); return w; };
    expect(execute(30)).toEqual(execute(144)); expect(execute(30).colony.buildings).toHaveLength(1);
  });
});
