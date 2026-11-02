import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, type WorldState, type WorldControls } from '../src/sim/world';
import { applyDefenceAction, controlledTurret } from '../src/sim/defence';
import { advanceMeteor, predictMeteor } from '../src/sim/meteor';
import { damageColony, repairBuilding } from '../src/sim/buildingDamage';
import { buildingHealth } from '../src/sim/buildingHealth';
import { stepWeapons, lineOfSight, turretState } from '../src/sim/weapons';
import { fracture } from '../src/sim/mining';
import { isTurret, WEAPONS, type Meteor, type Weapon } from '../src/sim/defenceConfig';
import { applyColonyAction, energyCapacity, oreCapacity, stepColony } from '../src/sim/colony';
import { BLUEPRINTS } from '../src/sim/colonyConfig';
import { STEP, WORLD } from '../src/sim/config';
import { heading } from '../src/sim/math';
import { stationPosition } from '../src/sim/stations';
import { encodeCheckpoint, decodeCheckpoint } from '../src/persistence/checkpoint';

const idle = { thrust: false, turn: 0 };
function base(kind: Weapon = 'laser'): WorldState {
  const w = createWorld(); w.asteroids = []; w.playerMode = 'astronaut'; w.astronaut.position = stationPosition(0.1);
  w.colony.buildings = [
    { id: 1, kind: 'solar', angle: 0.16, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
    { id: 2, kind, angle: 0.1, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
    { id: 3, kind: 'battery', angle: 0.2, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
  ]; w.colony.nextId = 4; w.colony.energy = 20; return w;
}
function meteor(w: WorldState, altitude = 350, speed = 20, angle = 0.1, stage = 1): Meteor {
  const n = heading(angle);
  return { id: w.nextId++, position: { x: n.x * (WORLD.radius + altitude), y: n.y * (WORLD.radius + altitude) },
    velocity: { x: -n.x * speed, y: -n.y * speed }, radius: stage ? 8 : 14, mass: stage ? 600 : 1200,
    stage, resource: 'iron', health: stage ? 0.55 : 1, maxHealth: stage ? 0.55 : 1 };
}
function run(w: WorldState, seconds: number, controls: WorldControls = idle) { for (let i = 0; i < Math.round(seconds / STEP); i++) stepWorld(w, controls, STEP); }

describe('physical meteor threats', () => {
  it('keeps the sandbox peaceful until requested and bounds drill overlap/escalation', () => {
    const w = base(); run(w, 2); expect(w.defence.meteors).toHaveLength(0);
    applyDefenceAction(w, { type: 'startWave' }); expect(w.defence.wave).toBe(1); expect(w.defence.meteors).toHaveLength(1);
    applyDefenceAction(w, { type: 'startWave' }); expect(w.defence.wave).toBe(1);
    w.defence.meteors = []; w.defence.wave = 100; applyDefenceAction(w, { type: 'startWave' }); expect(w.defence.meteors).toHaveLength(3);
  });
  it('predicts the same gravity/drag trajectory and first surface impact without mutating the source', () => {
    const w = base(), m = meteor(w, 900, 80), before = structuredClone(m), prediction = predictMeteor(m);
    expect(m).toEqual(before); expect(prediction.impact).not.toBeNull();
    let contact = null, steps = 0; while (!contact && steps++ < 7200) contact = advanceMeteor(m, STEP);
    expect(prediction.impact).toEqual(contact); expect(prediction.seconds).toBeCloseTo(steps * STEP);
  });
  it('sweeps an extreme surface crossing, applies damage once and removes the threat', () => {
    const w = base(), m = meteor(w, 3000, 600000); w.defence.meteors.push(m); w.astronaut.position = stationPosition(-0.3);
    stepWorld(w, idle, STEP); expect(w.defence.impacts).toBe(1); expect(w.defence.meteors).toHaveLength(0);
    expect(buildingHealth(w.colony.buildings[1])).toBe(0); stepWorld(w, idle, STEP); expect(w.defence.impacts).toBe(1);
  });
  it('preserves mass and momentum on first interception and leaves dangerous fragments', () => {
    const w = base(), m = meteor(w, 700, 0, 0.1, 0); m.health = 0; w.defence.meteors.push(m);
    stepWorld(w, idle, STEP);
    expect(w.defence.meteors).toHaveLength(2); expect(w.defence.meteors.reduce((a, b) => a + b.mass, 0)).toBe(1200);
    expect(w.defence.meteors.every(m => m.stage === 1)).toBe(true); expect(w.defence.impacts).toBe(0);
    // Fragments inherit common gravity/drag; symmetric separation adds no net transverse momentum.
    const fragments = fracture(m, () => w.nextId++).rocks;
    expect(fragments.reduce((sum, c) => sum + c.mass * c.velocity.x, 0)).toBeCloseTo(m.mass * m.velocity.x, 8);
    expect(fragments.reduce((sum, c) => sum + c.mass * c.velocity.y, 0)).toBeCloseTo(m.mass * m.velocity.y, 8);
    run(w, 90); expect(w.defence.impacts).toBe(2);
  });
  it('allows a flying ship mining beam to intercept a fragment before terrain contact', () => {
    const w = base(); w.playerMode = 'ship'; w.ship.state = 'flying'; w.ship.position.y -= 100;
    const m = meteor(w, 180, 0, 0); m.health = 0.001; w.defence.meteors.push(m);
    stepWorld(w, { ...idle, mine: true }, STEP); expect(w.defence.intercepted).toBe(1); expect(w.defence.meteors).toHaveLength(0); expect(w.defence.impacts).toBe(0);
  });
});
describe('powered defence and controls', () => {
  it.each(['laser', 'flak', 'missile'] as const)('constructs the %s with material costs, then automatically intercepts a fragment', kind => {
    const w = base(kind), b = w.colony.buildings[1];
    const fresh = createWorld(); fresh.playerMode = 'astronaut'; fresh.astronaut.position = stationPosition(0.1); fresh.colony.buildOpen = true; fresh.colony.selected = kind;
    applyColonyAction(fresh, { type: 'place' }); expect(fresh.colony.buildings[0].kind).toBe(kind);
    expect(fresh.colony.products.alloy).toBe(28 - BLUEPRINTS[kind].cost.alloy!);
    turretState(b).automatic = true; w.defence.meteors.push(meteor(w)); const stock = w.colony.products.alloy;
    run(w, 10); expect(w.defence.intercepted).toBeGreaterThan(0); expect(w.defence.impacts).toBe(0); expect(w.defence.meteors).toHaveLength(0);
    expect(w.defence.shots).toBeGreaterThan(0); expect(w.colony.products.alloy).toBeLessThanOrEqual(stock);
    expect(w.colony.products.alloy).toBeCloseTo(stock - w.defence.shots * WEAPONS[kind].alloy, 8);
  });
  it.each(['laser', 'flak', 'missile'] as const)('defends a complete drill with an earned automatic %s turret and no free ammo', kind => {
    const w = base(kind); turretState(w.colony.buildings[1]).automatic = true;
    applyDefenceAction(w, { type: 'startWave' }); run(w, 100);
    expect(w.defence.meteors).toHaveLength(0); expect(w.defence.impacts).toBe(0); expect(w.defence.intercepted).toBeGreaterThanOrEqual(1);
    expect(w.colony.buildings.every(b => buildingHealth(b) === 100)).toBe(true);
    expect(w.colony.products.alloy).toBeCloseTo(28 - w.defence.shots * WEAPONS[kind].alloy, 8);
  });
  it('resolves a blocking mineral rock in the same tick so turret mining remains saveable', () => {
    const w = base(), rock = meteor(w, 100, 0); rock.health = 0.1; w.asteroids.push(rock);
    w.defence.meteors.push(meteor(w)); turretState(w.colony.buildings[1]).automatic = true;
    stepWorld(w, idle, STEP);
    expect(w.asteroids).toHaveLength(0); expect(w.pickups).toHaveLength(4);
    expect(w.defence.intercepted).toBe(0); expect(w.defence.meteors[0].health).toBe(0.55);
    expect(() => encodeCheckpoint(w)).not.toThrow();
  });
  it('does not fire without energy, ammunition, an in-range target or line of sight', () => {
    const w = base('missile'), b = w.colony.buildings[1]; turretState(b).automatic = true; w.defence.meteors.push(meteor(w));
    w.colony.energy = 0; stepWeapons(w, false, 0, STEP, new Map()); expect(w.defence.shots).toBe(0); expect(b.status).toBe('no power');
    w.colony.energy = 20; w.colony.products.components = 0; stepWeapons(w, false, 0, STEP, new Map()); expect(w.defence.shots).toBe(0); expect(b.status).toBe('no feedstock');
    w.colony.products.components = 8; w.defence.meteors[0].position.y = -10000; stepWeapons(w, false, 0, STEP, new Map()); expect(w.defence.shots).toBe(0);
    expect(lineOfSight({ x: 0, y: -1900 }, { x: 0, y: 1900 })).toBe(false);
    w.defence.meteors[0] = meteor(w, 350, 0, 0.1 + Math.PI); stepWeapons(w, false, 0, STEP, new Map()); expect(w.defence.shots).toBe(0);
    expect(w.colony.energy).toBe(20);
  });
  it('lets the crew aim and fire without walking or jumping, and releases invalid control', () => {
    const w = base(); applyDefenceAction(w, { type: 'controlTurret' }); expect(w.defence.controlled).toBe(2);
    const at = { ...w.astronaut.position }; run(w, 0.5, { ...idle, turn: 1, mine: true, jump: true });
    expect(w.astronaut.position).toEqual(at); expect(w.astronaut.grounded).toBe(true); expect(w.colony.buildings[1].turret!.aim).toBeGreaterThan(0.4);
    expect(w.defence.shots).toBe(2); expect(w.colony.energy).toBeLessThan(24);
    applyDefenceAction(w, { type: 'controlTurret' }); expect(w.defence.controlled).toBeNull();
    applyDefenceAction(w, { type: 'controlTurret' }); w.colony.buildings[1].health = 0; expect(controlledTurret(w)).toBeUndefined();
  });
  it('limits fire rate and prevents a disabled/wrecked turret from spending resources', () => {
    const w = base('flak'), b = w.colony.buildings[1]; w.defence.controlled = b.id;
    for (let i = 0; i < 60; i++) stepWeapons(w, true, 0, STEP, new Map()); expect(w.defence.shots).toBe(2);
    b.enabled = false; const energy = w.colony.energy; for (let i = 0; i < 120; i++) stepWeapons(w, true, 0, STEP, new Map()); expect(w.colony.energy).toBe(energy);
    b.enabled = true; b.health = 0; stepWeapons(w, true, 0, STEP, new Map()); expect(w.colony.energy).toBe(energy);
  });
  it('sweeps projectiles against moving fragments instead of tunnelling through them', () => {
    const w = base(), n = heading(0.1), m = meteor(w, 300, 0); w.defence.meteors.push(m);
    w.defence.projectiles.push({ id: w.nextId++, kind: 'missile', position: { x: n.x * 2000, y: n.y * 2000 }, velocity: { x: n.x * 60000, y: n.y * 60000 }, targetId: null, life: 2, fuse: 2 });
    stepWeapons(w, false, 0, STEP, new Map([[m.id, { ...m.position }]])); expect(m.health).toBeLessThanOrEqual(0); expect(w.defence.projectiles).toHaveLength(0);
  });
});
describe('persistent damage, repair and compatibility', () => {
  it('stops wrecked generation/production/capacity and reports stock lost to destroyed storage', () => {
    const w = base(); w.colony.buildings.push({ id: 4, kind: 'storage', angle: 0.3, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 }); w.colony.nextId = 5;
    w.depot.iron = 600; w.colony.products.alloy = 180; w.colony.energy = 220;
    damageColony(w, stationPosition(0.3), 200, 10); expect(oreCapacity(w.colony)).toBe(400); expect(w.depot.iron).toBe(400); expect(w.colony.products.alloy).toBe(100); expect(w.defence.lostStock).toBe(280);
    damageColony(w, stationPosition(0.2), 200, 10); expect(energyCapacity(w.colony)).toBe(20); expect(w.colony.energy).toBe(20);
    damageColony(w, stationPosition(0.16), 200, 10); stepColony(w, STEP); expect(w.colony.generation).toBe(0); expect(w.colony.buildings[0].status).toBe('wrecked');
    expect(() => encodeCheckpoint(w)).not.toThrow();
  });
  it('takes persistent damage in an undefended drill, then restores the wreck using supplied repair', () => {
    const w = base(); applyDefenceAction(w, { type: 'startWave' }); run(w, 100);
    expect(w.defence.impacts).toBe(1); expect(w.colony.buildings[2].health).toBe(0); expect(energyCapacity(w.colony)).toBe(20);
    const saved = decodeCheckpoint(encodeCheckpoint(w)); expect(saved.colony.buildings[2].health).toBe(0);
    saved.astronaut.position = stationPosition(0.2); const stock = saved.colony.products.alloy, charge = saved.colony.energy;
    applyDefenceAction(saved, { type: 'repairBuilding' }); expect(saved.colony.buildings[2].health).toBe(100);
    expect(saved.colony.products.alloy).toBeCloseTo(stock - 10); expect(energyCapacity(saved.colony)).toBe(220); expect(saved.colony.energy).toBe(charge);
  });
  it('repairs only nearby on foot with alloy, and gives no full-value salvage for a wreck', () => {
    const w = base(), b = w.colony.buildings[1]; b.health = 0; w.colony.products.alloy = 2;
    repairBuilding(w); expect(b.health).toBe(20); expect(w.colony.products.alloy).toBe(0); expect(b.status).toBe('idle');
    w.colony.products.alloy = 20; w.playerMode = 'ship'; repairBuilding(w); expect(b.health).toBe(20);
    w.playerMode = 'astronaut'; w.astronaut.position = stationPosition(-0.5); repairBuilding(w); expect(b.health).toBe(20);
    w.astronaut.position = stationPosition(0.1); b.health = 0; w.colony.buildOpen = true; const stock = { ...w.colony.products };
    applyColonyAction(w, { type: 'demolish' }); expect(w.colony.products).toEqual(stock);
  });
  it('round-trips an active drill, damage, ammo usage and automatic settings, but releases manual control', () => {
    const w = base('missile'); turretState(w.colony.buildings[1]).automatic = true; w.defence.controlled = 2; w.colony.buildings[0].health = 45;
    applyDefenceAction(w, { type: 'startWave' }); w.defence.controlled = null; run(w, 8); w.defence.controlled = 2;
    const loaded = decodeCheckpoint(encodeCheckpoint(w)); expect(loaded.defence).toEqual({ ...w.defence, controlled: null, beams: [] }); expect(loaded.colony).toEqual(w.colony);
    w.defence.controlled = null; run(w, 2); run(loaded, 2); expect(loaded.defence).toEqual(w.defence); expect(loaded.colony.products).toEqual(w.colony.products);
  });
  it('migrates alpha-0.2 saves without starting threats or changing planet positions/inventories', () => {
    const w = base(), legacy = JSON.parse(encodeCheckpoint(w)); legacy.version = 2; delete legacy.world.defence;
    legacy.world.colony.buildings = legacy.world.colony.buildings.filter((b: { kind: string }) => !isTurret(b.kind));
    const loaded = decodeCheckpoint(JSON.stringify(legacy)); expect(loaded.defence.wave).toBe(0); expect(loaded.defence.meteors).toHaveLength(0);
    expect(loaded.ship.position).toEqual(w.ship.position); expect(loaded.colony.products).toEqual(w.colony.products);
  });
  it('rejects invalid defence saves, duplicate IDs, unbounded ammo and impossible turret state', () => {
    const w = base(), valid = JSON.parse(encodeCheckpoint(w));
    for (const mutate of [
      (v: typeof valid) => { delete v.world.defence; },
      (v: typeof valid) => { const m = meteor(w); v.world.defence.meteors = [m, { ...m }]; v.world.nextId = w.nextId; },
      (v: typeof valid) => { v.world.defence.projectiles = Array(33).fill({}); },
      (v: typeof valid) => { v.world.colony.buildings[1].health = -1; },
      (v: typeof valid) => { v.world.colony.buildings[1].turret = { aim: 8, automatic: true, cooldown: 0 }; },
    ]) { const candidate = structuredClone(valid); mutate(candidate); expect(() => decodeCheckpoint(JSON.stringify(candidate))).toThrow(); }
  });
});
