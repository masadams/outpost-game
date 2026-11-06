import { applyTowAction } from '../src/sim/towing';
import { fireLaser } from '../src/sim/mining';
import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { applyColonyAction, placementError, stepColony, type Building } from '../src/sim/colony';
import { completedBuilding } from '../src/sim/construction';
import { SHIELDS, SHIELD } from '../src/sim/shieldConfig';
import { absorbShield, firstShieldHit, shieldActive } from '../src/sim/shields';
import { advanceMeteor, meteorDamage } from '../src/sim/meteor';
import { stepDefence, resolveDefenceHits } from '../src/sim/defence';
import type { Meteor } from '../src/sim/defenceConfig';
import { stepCombatProjectiles } from '../src/sim/combatProjectiles';
import { damageColony, repairBuilding } from '../src/sim/buildingDamage';
import { habitatSource } from '../src/sim/habitats';
import { createHabitat } from '../src/sim/habitatConfig';
import { TECH_IDS } from '../src/sim/progressionConfig';
import { FixedClock } from '../src/sim/clock';
import { STEP, WORLD } from '../src/sim/config';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';
import { AudioDirector } from '../src/audio/director';

function fixture(kind: 'shieldSmall' | 'shieldLarge' = 'shieldSmall') {
  const w = createWorld(); w.asteroids = []; w.exploration.sites = [];
  w.colony.research.completed = [...TECH_IDS];
  const b = completedBuilding(1, kind, 0, w);
  w.colony.buildings = [b, completedBuilding(2, 'solar', .1, w), completedBuilding(3, 'battery', .2, w)]; w.colony.nextId = 4;
  return { w, b, h: b.shield! };
}
const run = (w: ReturnType<typeof createWorld>, seconds: number) => { for (let i = 0; i < Math.round(seconds / STEP); i++) stepColony(w, STEP); };
const arm = (b: Building, charge = 120) => Object.assign(b.shield!, { charge, powered: true, ready: true });
const meteor = (w: ReturnType<typeof createWorld>, altitude = 150, speed = 1000, mass = 20): Meteor => ({ id: w.nextId++, position: { x: 0, y: -WORLD.radius - altitude }, velocity: { x: 0, y: speed }, radius: 2, mass, stage: 0, resource: 'iron', health: 1, maxHealth: 1 });
const segment = { start: { x: 0, y: -WORLD.radius - 150 }, end: { x: 0, y: -WORLD.radius + 20 } };
const hit = (w: ReturnType<typeof createWorld>) => firstShieldHit(w, segment.start, segment.end, 0)!;
function bullet(w: ReturnType<typeof createWorld>, owner: 'ship' | 'enemy' = 'enemy', altitude = 150, speed = 2000) {
  w.combat.projectiles.push({ id: w.nextId++, owner, kind: 'cannon', position: { x: 0, y: -WORLD.radius - altitude }, velocity: { x: 0, y: speed }, life: 5, targetId: null });
}
const projectiles = (w: ReturnType<typeof createWorld>, dt = .1) => stepCombatProjectiles(w, dt, { ship: { ...w.ship.position }, suit: { ...w.astronaut.position }, rocks: new Map(), meteors: new Map(), enemies: new Map() });

describe('supplied shield domes', () => {
  it('gates both emitters behind Combat engineering and charges actual build stocks', () => {
    const { w } = fixture(); w.colony.buildings = []; w.playerMode = 'astronaut'; w.astronaut.grounded = true; w.astronaut.position = { x: 0, y: -WORLD.radius - 2 }; w.colony.offset = 96; w.colony.buildOpen = true;
    w.colony.research.completed = [];
    for (const kind of ['shieldSmall', 'shieldLarge'] as const) expect(placementError(w, kind)).toContain('Combat');
    w.colony.research.completed = [...TECH_IDS]; w.colony.selected = 'shieldSmall';
    applyColonyAction(w, { type: 'place' }); expect(w.colony.products).toMatchObject({ alloy: 16, wire: 10, components: 5 }); expect(w.colony.buildings[0].shield?.charge).toBe(0);
  });
  it.each(['shieldSmall', 'shieldLarge'] as const)('%s starts empty, pays for every SP and arms only at 25 percent', kind => {
    const { w, b, h } = fixture(kind), spec = SHIELDS[kind]; w.colony.energy = 100;
    run(w, 1); expect(h.charge).toBeCloseTo(spec.recharge); expect(shieldActive(b)).toBe(false); expect(w.colony.shielding.energyUsed).toBeCloseTo(spec.upkeep + spec.recharge);
    run(w, spec.capacity * SHIELD.rearmFraction / spec.recharge - 1); expect(shieldActive(b)).toBe(true);
  });
  it('holds protected charge while still paying essential upkeep; cap applies to total emitter draw', () => {
    const { w, b, h } = fixture(); w.colony.energy = 20; w.colony.policy = { energyReserve: 1000, alloyReserve: 0, componentsReserve: 0, deliveryReserve: 0 };
    run(w, 1); expect(h.powered).toBe(true); expect(h.charge).toBe(0); expect(w.colony.shielding.energyUsed).toBeCloseTo(1);
    w.colony.policy.energyReserve = 0; b.dispatch = { rank: 0, limit: 40 }; run(w, 1); expect(h.charge).toBeCloseTo(1); expect(b.gridPower).toBeCloseTo(2);
    b.dispatch.limit = 10; run(w, 1); expect(h.powered).toBe(false); expect(h.charge).toBeCloseTo(1); expect(b.status).toBe('power limited');
  });
  it('drops on power loss without refilling or erasing paid charge', () => {
    const { w, b, h } = fixture(); arm(b, 45); w.colony.buildings[1].enabled = false;
    run(w, 1); expect(shieldActive(b)).toBe(false); expect(h.charge).toBe(45); expect(b.status).toBe('no power');
    w.colony.energy = 5; stepColony(w, STEP); expect(shieldActive(b)).toBe(true); expect(h.charge).toBeGreaterThan(45);
  });
  it('funds life support before shield upkeep and keeps oxygen independent', () => {
    const { w, b, h } = fixture(); w.colony.buildings[1].enabled = false;
    const habitat = completedBuilding(4, 'habitatSmall', 0, w); habitat.habitat = createHabitat(); habitat.habitat.oxygen = 1; w.colony.buildings.push(habitat); w.colony.nextId = 5;
    w.colony.energy = 2 * STEP; arm(b); stepColony(w, STEP); expect(habitat.habitat.powered).toBe(true); expect(h.powered).toBe(false);
    w.playerMode = 'astronaut'; w.astronaut.position = { x: 0, y: -WORLD.radius - 2 }; habitat.enabled = false;
    expect(habitatSource(w)).toBeUndefined(); expect(w.colony.products.oxygen).toBeLessThanOrEqual(2);
  });
  it('cannot toggle around breach delay, recovery or rearm threshold', () => {
    const { w, b, h } = fixture(); arm(b, 10); absorbShield(w, hit(w), 20, { x: 0, y: 100 }, 2);
    expect(h.ready).toBe(false); expect(h.recovery).toBe(5); b.enabled = false; run(w, 1); b.enabled = true; run(w, 1);
    expect(h.charge).toBeLessThanOrEqual(4 * STEP + 1e-7); expect(shieldActive(b)).toBe(false);
    run(w, 5); expect(h.recovery).toBe(0); expect(h.charge).toBeLessThan(30); expect(shieldActive(b)).toBe(false);
    run(w, 3); expect(shieldActive(b)).toBe(true); expect(w.colony.shielding.breaches).toBe(1);
  });
  it('loses stored charge on wreck and never refunds it through repair', () => {
    const { w, b, h } = fixture(); arm(b, 50); damageColony(w, { x: 0, y: -WORLD.radius }, 120, 5);
    expect(b.health).toBe(0); expect(h.charge).toBe(0); expect(w.colony.shielding.lostCharge).toBe(50);
    w.playerMode = 'astronaut'; w.astronaut.position = { x: 0, y: -WORLD.radius - 2 }; w.astronaut.grounded = true; repairBuilding(w);
    expect(b.health).toBe(100); expect(h.charge).toBe(0); expect(shieldActive(b)).toBe(false);
  });
  it('vents charge when demolishing without producing oxygen or collectible mass', () => {
    const { w, b } = fixture(); arm(b, 50); w.playerMode = 'astronaut'; w.astronaut.grounded = true; w.astronaut.position = { x: 0, y: -WORLD.radius - 2 };
    w.colony.buildOpen = true; const oxygen = w.colony.products.oxygen; applyColonyAction(w, { type: 'demolish' }); expect(w.colony.buildings).not.toContain(b); expect(w.colony.shielding.lostCharge).toBe(50); expect(w.colony.products.oxygen).toBe(oxygen); expect(w.pickups).toHaveLength(0);
  });
});

describe('continuous selective shield interception', () => {
  it('sweeps a crossing even when both segment endpoints are outside', () => {
    const { w, b } = fixture(); arm(b); const field = firstShieldHit(w, { x: -200, y: -WORLD.radius - 20 }, { x: 200, y: -WORLD.radius - 20 }, 0);
    expect(field?.t).toBeGreaterThan(0); expect(field?.t).toBeLessThan(.5);
  });
  it('skips outgoing and already-inside paths, with deterministic overlap tie breaking', () => {
    const { w, b } = fixture(); arm(b); expect(firstShieldHit(w, segment.end, segment.start, 0)).toBeNull();
    expect(firstShieldHit(w, { x: 0, y: -WORLD.radius - 30 }, segment.end, 0)).toBeNull();
    const second = completedBuilding(4, 'shieldSmall', 0, w); arm(second); w.colony.buildings.unshift(second);
    expect(hit(w).building.id).toBe(1); expect(firstShieldHit(w, segment.start, segment.end, 0, .1)).toBeNull();
  });
  it('fully disperses a fast meteor without children, ore or terrain damage', () => {
    const { w, b } = fixture('shieldLarge'); arm(b, 360); const m = meteor(w); w.defence.meteors = [m];
    stepDefence(w, false, 0, .2, { ...w.ship.position });
    expect(w.defence.meteors).toHaveLength(0); expect(w.defence.intercepted).toBe(1); expect(w.defence.impacts).toBe(0); expect(w.pickups).toHaveLength(0); expect(w.colony.shielding.dustMass).toBe(20); expect(w.ship.hull).toBe(100);
  });
  it('reduces kinetic energy and retains a single residual damage budget after a partial interception', () => {
    const { w, b } = fixture(); arm(b, 5); const m = meteor(w, 90, 300, 1200); m.impactBudget = 20;
    advanceMeteor(m, .1, w); expect(m.impactBudget).toBeCloseTo(15); expect(meteorDamage(m)).toBeCloseTo(15); expect(m.velocity.y).toBeLessThan(300); expect(w.colony.shielding.dissipatedEnergy).toBeGreaterThan(0); expect(w.colony.shielding.dustMass).toBe(0);
    w.defence.meteors = [m]; stepDefence(w, false, 0, .5, { ...w.ship.position }); expect(w.defence.impacts).toBe(1); expect(b.health).toBeCloseTo(85);
  });
  it('splits the residual meteor budget among fragments without duplicating it', () => {
    const { w } = fixture(); const m = meteor(w); m.impactBudget = 30; m.health = 0; w.defence.meteors = [m]; resolveDefenceHits(w);
    expect(w.defence.meteors).toHaveLength(2); expect(w.defence.meteors.reduce((sum, m) => sum + m.impactBudget!, 0)).toBe(30);
  });
  it('uses successive boundaries for overlap overflow and handles simultaneous threats in stable order', () => {
    const { w, b } = fixture(); arm(b, 5); const outer = completedBuilding(4, 'shieldLarge', 0, w); arm(outer, 5); w.colony.buildings.push(outer);
    const m = meteor(w, 150, 1200, 1200); m.impactBudget = 12; advanceMeteor(m, .15, w);
    expect(m.impactBudget).toBeCloseTo(2); expect(w.colony.shielding.hits).toBe(2); expect(w.colony.shielding.breaches).toBe(2);
    arm(b, 15); bullet(w); bullet(w); projectiles(w); expect(w.colony.shielding.hits).toBe(4); expect(b.shield!.charge).toBe(0); expect(w.colony.shielding.dustMass).toBeGreaterThan(0);
  });
  it('absorbs enemy shots but lets friendly ammunition pass through without charge cost', () => {
    const { w, b } = fixture(); arm(b); bullet(w); projectiles(w); expect(w.combat.projectiles).toHaveLength(0); expect(w.ship.hull).toBe(100); expect(b.shield!.charge).toBe(110);
    bullet(w, 'ship'); projectiles(w); expect(b.shield!.charge).toBe(110); expect(w.colony.shielding.hits).toBe(1);
  });
  it('retains partial shot damage across steps and applies it once at the physical victim', () => {
    const { w, b } = fixture(); arm(b, 5); bullet(w, 'enemy', 70, 100); projectiles(w, .1);
    expect(w.combat.projectiles[0].shieldScale).toBeCloseTo(.5); expect(w.combat.projectiles[0].velocity.y).toBeLessThan(100);
    for (let i = 0; i < 20; i++) projectiles(w, .1);
    expect(w.ship.hull).toBeCloseTo(95); expect(w.combat.projectiles).toHaveLength(0); expect(w.colony.shielding.hits).toBe(1);
  });
  it('allows attacks spawned inside and does not intercept before a nearer physical target', () => {
    const { w, b } = fixture(); arm(b); bullet(w, 'enemy', 30, 300); projectiles(w); expect(w.ship.hull).toBe(90); expect(b.shield!.charge).toBe(120);
    w.ship.position = { x: 0, y: -WORLD.radius - 90 }; bullet(w); projectiles(w); expect(w.ship.hull).toBe(80); expect(b.shield!.charge).toBe(120);
  });
  it('retests moving victims after a partial slowdown instead of applying a stale collision', () => {
    const simulate = (protectedShip: boolean) => {
      const { w, b } = fixture(); if (protectedShip) arm(b, 5);
      w.ship.state = 'flying'; w.ship.position = { x: 10, y: -WORLD.radius - 15 };
      bullet(w); w.combat.projectiles[0].position = { x: -150, y: -WORLD.radius - 40 }; w.combat.projectiles[0].velocity = { x: 2000, y: 0 };
      stepCombatProjectiles(w, .1, { ship: { x: 10, y: -WORLD.radius - 140 }, suit: w.astronaut.position, rocks: new Map(), meteors: new Map(), enemies: new Map() });
      return w;
    };
    expect(simulate(false).ship.hull).toBe(90); const w = simulate(true); expect(w.ship.hull).toBe(100); expect(w.combat.projectiles).toHaveLength(1); expect(w.combat.projectiles[0].shieldScale).toBeCloseTo(.5);
  });
  it('lets ships, physical tow cargo and mining beams cross exactly as they do without a field', () => {
    const simulate = (enabled: boolean) => {
      const { w, b } = fixture('shieldLarge'); arm(b, 360); b.enabled = enabled; w.ship.towRig = true; w.ship.state = 'flying';
      w.ship.position = { x: -150, y: -WORLD.radius - 40 }; w.ship.velocity = { x: 80, y: 0 }; w.ship.angle = Math.PI / 2;
      const rock = meteor(w, 40, 0, 80); rock.position.x = -100; rock.velocity = { x: 80, y: 0 }; w.asteroids = [rock];
      const beam = fireLaser(w.ship, w.asteroids, STEP); applyTowAction(w, { type: 'toggleTow' }); expect(w.towing.targetId).toBe(rock.id);
      for (let i = 0; i < 120; i++) stepWorld(w, { thrust: false, turn: 0 }, STEP);
      expect(w.colony.shielding.hits).toBe(0); expect(w.pickups).toHaveLength(0);
      return { ship: w.ship, rocks: w.asteroids, tow: w.towing, beam };
    };
    expect(simulate(true)).toEqual(simulate(false));
  });
  it('resolves a ship outside the dome before a farther shield or surface impact', () => {
    const { w, b } = fixture(); arm(b); w.ship.state = 'flying'; w.ship.position = { x: 0, y: -WORLD.radius - 90 };
    w.defence.meteors = [meteor(w, 150, 1000, 1200)]; stepDefence(w, false, 0, .2, { ...w.ship.position });
    expect(w.ship.hull).toBeLessThan(100); expect(w.colony.shielding.hits).toBe(0); expect(w.defence.impacts).toBe(0); expect(b.shield!.charge).toBe(120);
  });
  it('does not catch a threat through the planet', () => {
    const { w, b } = fixture('shieldLarge'); b.angle = Math.PI; arm(b, 360); const m = meteor(w, 150, 1000, 1200); w.defence.meteors = [m]; stepDefence(w, false, 0, .3, { ...w.ship.position });
    expect(w.defence.impacts).toBe(1); expect(w.colony.shielding.hits).toBe(0);
  });
});

describe('shield persistence and feedback', () => {
  it('round trips charge, breach timers, partial threats and accounting without recharge on load', () => {
    const { w, b } = fixture(); arm(b, 5); const m = meteor(w, 90, 300, 1200); m.impactBudget = 20; advanceMeteor(m, .1, w); w.defence.meteors = [m];
    const saved = encodeCheckpoint(w), loaded = decodeCheckpoint(saved); expect(JSON.parse(saved).version).toBe(23); expect(loaded.colony.shielding).toEqual(w.colony.shielding); expect(loaded.colony.buildings[0].shield).toEqual(b.shield); expect(loaded.defence.meteors[0].impactBudget).toBe(15);
  });
  it.each(['charge', 'recovery', 'ready', 'missing', 'ledger', 'budget', 'zero budget', 'scale'])('rejects malformed %s checkpoint state', field => {
    const { w, b } = fixture(); arm(b); const raw = JSON.parse(encodeCheckpoint(w));
    if (field === 'charge') raw.world.colony.buildings[0].shield.charge = 121;
    if (field === 'recovery') raw.world.colony.buildings[0].shield.recovery = 3;
    if (field === 'ready') raw.world.colony.buildings[0].shield.ready = 'yes';
    if (field === 'missing') delete raw.world.colony.buildings[0].shield;
    if (field === 'ledger') raw.world.colony.shielding.hits = -1;
    if (field === 'budget') { raw.world.defence.meteors = [meteor(w)]; raw.world.nextId = w.nextId; raw.world.defence.meteors[0].impactBudget = 181; }
    if (field === 'zero budget') { raw.world.defence.meteors = [meteor(w)]; raw.world.nextId = w.nextId; raw.world.defence.meteors[0].impactBudget = 0; }
    if (field === 'scale') { bullet(w); raw.world.combat.projectiles = w.combat.projectiles; raw.world.nextId = w.nextId; raw.world.combat.projectiles[0].shieldScale = 2; }
    expect(() => decodeCheckpoint(JSON.stringify(raw))).toThrow();
  });
  it('plays hit/breach cues once and remains silent during pause/load', () => {
    const { w, b } = fixture(); arm(b, 15); const audio = new AudioDirector(); audio.reset(w);
    absorbShield(w, hit(w), 10, { x: 0, y: 100 }, 1); expect(audio.update(w, STEP, false).cues).toContain('shieldHit'); expect(audio.update(w, STEP, false).cues).not.toContain('shieldHit');
    absorbShield(w, hit(w), 10, { x: 0, y: 100 }, 1); expect(audio.update(w, STEP, true).cues).toEqual([]); audio.reset(w); expect(audio.update(w, STEP, false).cues).not.toContain('shieldBreach');
  });
  it('has identical paid charging and threat state at 30 and 144 Hz rendering', () => {
    const simulate = (fps: number) => { const { w } = fixture(); const clock = new FixedClock(); for (let i = 0; i < fps * 10; i++) clock.advance(1 / fps, dt => stepWorld(w, { thrust: false, turn: 0, mine: false, tractor: false, combatFire: false }, dt)); return encodeCheckpoint(w); };
    expect(simulate(30)).toBe(simulate(144));
  });
});
