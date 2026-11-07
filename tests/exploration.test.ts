import { planetAt, relative, surfacePosition } from '../src/sim/celestial';
import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, unloadCargo } from '../src/sim/world';
import { applyExplorationAction, navigation, siteError, resolveSites, seedNeighborhood, orbitalState } from '../src/sim/exploration';
import { createExploration, BELT_IDS, EXPLORATION } from '../src/sim/explorationConfig';
import { fracture, tractor } from '../src/sim/mining';
import { inventoryMass, CARGO_CAPACITY } from '../src/sim/resources';
import { shipMass } from '../src/sim/shipMass';
import { STEP, WORLD } from '../src/sim/config';
import { length } from '../src/sim/math';
import { FixedClock } from '../src/sim/clock';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';
function rendezvous(key: 'survey' | 'cache' | 'tender' = 'cache') {
  const w = createWorld(), s = w.exploration.sites.find(s => s.key === key)!;
  w.exploration.selected = key; w.ship.state = 'flying'; w.ship.position = { x: s.position.x, y: s.position.y - 80 }; w.ship.velocity = { ...s.velocity }; return { w, s };
}
const visit = (w: ReturnType<typeof createWorld>) => applyExplorationAction(w, { type: 'visitSite' });
describe('finite nearby-space discovery', () => {
  it('seeds three distinct bounded belts and physical sites outside the atmosphere deterministically', () => {
    const w = createWorld(); expect(w).toEqual(createWorld()); expect(w.asteroids).toHaveLength(31); expect(w.exploration.sites).toHaveLength(3);
    for (const b of BELT_IDS) { const rocks = w.asteroids.filter(r => r.belt === b); expect(rocks).toHaveLength(4); expect(rocks.every(r => length(r.position) > WORLD.radius + 1200)).toBe(true); }
    const ids = [...w.asteroids, ...w.exploration.sites].map(b => b.id); expect(new Set(ids).size).toBe(ids.length); expect(w.nextId).toBeGreaterThan(Math.max(...ids));
    const initial = w.asteroids.length; seedNeighborhood(w); expect(w.asteroids).toHaveLength(initial);
  });
  it('uses live mass-weighted belt positions and includes fragments and drifting ore', () => {
    const w = createWorld(), parent = w.asteroids.find(b => b.belt === 'frost')!;
    const out = fracture(parent, () => w.nextId++); expect(out.rocks.every(b => b.belt === 'frost')).toBe(true);
    const ore = out.rocks.flatMap(b => fracture(b, () => w.nextId++).ore); expect(ore.every(b => b.belt === 'frost')).toBe(true);
    expect(ore.reduce((sum, b) => sum + b.mass, 0)).toBeCloseTo(parent.mass);
    w.asteroids = w.asteroids.filter(b => b.belt !== 'frost'); w.pickups = ore; w.exploration.selected = 'frost';
    const first = navigation(w).position; for (const p of ore) p.position.x += 100; expect(navigation(w).position.x - first.x).toBeCloseTo(100);
  });
  it('computes closing and total relative motion separately and handles zero range', () => {
    const { w, s } = rendezvous(); w.ship.velocity = { x: s.velocity.x + 5, y: s.velocity.y + 2 };
    const n = navigation(w); expect(n.range).toBeCloseTo(80); expect(n.closing).toBeCloseTo(2); expect(n.relativeSpeed).toBeCloseTo(Math.sqrt(29));
    w.ship.position = { ...s.position }; expect(navigation(w).range).toBe(0); expect(navigation(w).bearing).toBe(0);
  });
  it('rejects distant, fast, occluded, wrecked or unpiloted site interactions', () => {
    const { w, s } = rendezvous(); w.ship.position.y -= 1000; expect(siteError(w, s)).toMatch(/120/); visit(w); expect(w.exploration.salvaged).toBe(0);
    w.ship.position = { x: s.position.x, y: s.position.y - 80 }; w.ship.velocity.x += 20; expect(siteError(w, s)).toMatch(/8 m/);
    w.ship.velocity = { ...s.velocity }; w.playerMode = 'astronaut'; expect(siteError(w, s)).toMatch(/Pilot/); w.playerMode = 'ship'; s.health = 0; expect(siteError(w, s)).toMatch(/wrecked/);
    w.ship.position = { x: 0, y: -WORLD.radius - 100 }; s.position = { x: 0, y: WORLD.radius + 100 }; expect(navigation(w).occluded).toBe(true);
  });
  it('surveys actual resources once without giving the player material or fuel', () => {
    const { w } = rendezvous('survey'), products = { ...w.colony.products }; visit(w); visit(w);
    expect(w.exploration.surveyed).toEqual(['frost']); expect(w.ship.cargo).toEqual(createWorld().ship.cargo); expect(w.colony.products).toEqual(products); expect(w.ship.fuel).toBe(WORLD.fuelCapacity);
  });
  it('partially salvages into available hold room and conserves mass and momentum', () => {
    const { w, s } = rendezvous(); w.ship.cargo.iron = CARGO_CAPACITY - 5; w.ship.velocity.x += 2;
    const before = shipMass(w.ship) + s.mass, momentum = shipMass(w.ship) * w.ship.velocity.x + s.mass * s.velocity.x;
    visit(w); expect(inventoryMass(w.ship.cargo)).toBe(CARGO_CAPACITY); expect(inventoryMass(s.stock)).toBe(13); expect(w.exploration.salvaged).toBe(5);
    expect(shipMass(w.ship) + s.mass).toBeCloseTo(before); expect(shipMass(w.ship) * w.ship.velocity.x + s.mass * s.velocity.x).toBeCloseTo(momentum);
    visit(w); expect(inventoryMass(s.stock)).toBe(13);
  });
  it('exhausts the cache exactly once and confirms a normal home delivery', () => {
    const { w, s } = rendezvous(); visit(w); visit(w); expect(w.exploration.salvaged).toBe(18); expect(inventoryMass(s.stock)).toBe(0);
    expect(w.ship.cargo.copper).toBe(12); expect(w.ship.cargo.rareMetals).toBe(6);
    w.ship.state = 'landed'; w.ship.position = { x: 0, y: -WORLD.radius - WORLD.shipRadius }; expect(unloadCargo(w)).toBe(18); expect(w.exploration.returned).toBe(true);
    expect(w.depot.copper + w.depot.rareMetals).toBe(18); expect(w.exploration.salvaged).toBe(18);
  });
  it('transfers finite fuel with matching mass/momentum and never overfills', () => {
    const { w, s } = rendezvous('tender'); w.ship.fuel = WORLD.fuelCapacity - 5; w.ship.velocity.x += 2;
    const mass = shipMass(w.ship) + s.mass, momentum = shipMass(w.ship) * w.ship.velocity.x + s.mass * s.velocity.x;
    visit(w); expect(w.ship.fuel).toBe(WORLD.fuelCapacity); expect(s.fuel).toBe(13); expect(w.exploration.refuelled).toBe(5);
    expect(shipMass(w.ship) + s.mass).toBeCloseTo(mass); expect(shipMass(w.ship) * w.ship.velocity.x + s.mass * s.velocity.x).toBeCloseTo(momentum);
    visit(w); expect(s.fuel).toBe(13); w.ship.fuel -= 20; visit(w); expect(s.fuel).toBe(0); expect(w.exploration.refuelled).toBe(18);
  });
  it('releases cached ore once when a site is destroyed and vents finite fuel', () => {
    const { w, s } = rendezvous(); s.health = -1; const tender = w.exploration.sites.find(s => s.key === 'tender')!; tender.health = -1;
    resolveSites(w); expect(w.pickups.reduce((q, p) => q + p.mass, 0)).toBe(18); expect(w.exploration.fuelLost).toBe(18); expect(s.mass).toBe(EXPLORATION.dryMass);
    resolveSites(w); expect(w.pickups.reduce((q, p) => q + p.mass, 0)).toBe(18); expect(w.exploration.fuelLost).toBe(18);
  });
  it('moves sites continuously under the shared gravity model with no far-field freeze', () => {
    const w = createWorld(), s = w.exploration.sites[0], initial = { ...s.position };
    for (let i = 0; i < 120; i++) stepWorld(w, { thrust: false, turn: 0 }, STEP);
    expect(s.position).not.toEqual(initial); expect(Math.abs(length(relative(s.position, planetAt('home', w.system))) - length(initial))).toBeLessThan(3);
  });
  it('sweeps ship collisions against physical sites rather than allowing a fast pass', () => {
    const { w, s } = rendezvous(); w.asteroids = []; w.ship.position = { x: s.position.x, y: s.position.y - 50 }; w.ship.velocity = { x: s.velocity.x, y: s.velocity.y + 20000 };
    const health = w.ship.hull; stepWorld(w, { thrust: false, turn: 0 }, STEP); expect(w.ship.hull).toBeLessThan(health); expect(w.ship.state).toBe('crashed');
  });
  it('keeps finite fragment/ore counts within checkpoint budgets and preserves all mass', () => {
    const w = createWorld(), mass = w.asteroids.reduce((sum, b) => sum + b.mass, 0);
    const pieces = w.asteroids.flatMap(b => fracture(b, () => w.nextId++).rocks); expect(pieces).toHaveLength(62);
    const ore = pieces.flatMap(b => fracture(b, () => w.nextId++).ore); expect(ore).toHaveLength(248);
    expect(ore.reduce((sum, b) => sum + b.mass, 0)).toBeCloseTo(mass); expect(ore.length + 2).toBeLessThanOrEqual(256);
  });
  it('mines, collects and unloads a tagged belt fragment through ordinary controls', () => {
    const w = createWorld(), r = w.asteroids.find(b => b.belt === 'frost')!;
    w.ship.state = 'flying'; w.ship.position = { x: 0, y: -WORLD.radius - 1500 }; w.ship.velocity = { x: 0, y: 0 }; w.ship.angle = 0;
    r.position = { x: 0, y: w.ship.position.y - 40 }; r.velocity = { x: 0, y: 0 }; r.radius = 8; r.stage = 1; r.health = .005; r.maxHealth = .55; r.mass = 12;
    w.asteroids = [r]; stepWorld(w, { thrust: false, turn: 0, mine: true }, STEP); expect(w.pickups.every(p => p.belt === 'frost')).toBe(true);
    for (let i = 0; i < 600; i++) stepWorld(w, { thrust: false, turn: 0, tractor: true }, STEP);
    expect(inventoryMass(w.ship.cargo)).toBeCloseTo(12); w.ship.state = 'landed'; expect(unloadCargo(w)).toBeCloseTo(12); expect(w.depot.ice).toBeCloseTo(12);
  });
  it('survey cues are pause safe and do not repeat for revisits', async () => {
    const { AudioDirector } = await import('../src/audio/director'); const { w } = rendezvous('survey'), audio = new AudioDirector(); audio.reset(w);
    visit(w); expect(audio.update(w, .1, false).cues).toContain('service'); visit(w); expect(audio.update(w, .1, false).cues).not.toContain('service');
    expect(audio.update(w, 1, true).cues).toEqual([]);
  });
  it('round trips depleted stocks, surveyed manifests, selection and moving bodies in the current format', () => {
    const { w, s } = rendezvous(); visit(w); const text = encodeCheckpoint(w); expect(JSON.parse(text).version).toBe(33);
    const loaded = decodeCheckpoint(text); expect(loaded.exploration).toEqual(w.exploration); expect(loaded.asteroids).toEqual(w.asteroids); seedNeighborhood(loaded); expect(loaded.asteroids).toHaveLength(31); expect(loaded.exploration.sites.find(t => t.key === s.key)?.stock).toEqual(s.stock);
  });
  it('rejects duplicate site IDs, invalid stocks, non-finite motion and malformed belt tags', () => {
    const text = encodeCheckpoint(createWorld());
    for (const change of [(x: any) => x.world.exploration.sites[0].id = x.world.asteroids[0].id, (x: any) => x.world.exploration.sites[1].stock.copper = 99, (x: any) => x.world.exploration.sites[0].velocity.x = null, (x: any) => x.world.asteroids[16].belt = 'unknown']) {
      const saved = JSON.parse(text); change(saved); expect(() => decodeCheckpoint(JSON.stringify(saved))).toThrow();
    }
  });
  it('runs at identical fixed-step state through 30 and 144 Hz rendering', () => {
    const run = (hz: number) => { const w = createWorld(), clock = new FixedClock(); for (let i = 0; i < hz * 5; i++) clock.advance(1 / hz, dt => stepWorld(w, { thrust: false, turn: 0 }, dt)); return w; };
    expect(run(30)).toEqual(run(144));
  });
});
