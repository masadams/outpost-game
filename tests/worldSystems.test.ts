import { pursuitAcceleration } from '../src/sim/guidance';
import { stepWeapons } from '../src/sim/weapons';
import { ORBIT_RATE } from '../src/sim/celestial';
import { predictCoast } from '../src/sim/trajectory';
import { describe, it, expect } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { planetAt, relative, surfacePosition, STATIC_SYSTEM } from '../src/sim/celestial';
import { colonyWorld, colonyPlanet, allocateBuildingId } from '../src/sim/localWorld';
import { completedBuilding } from '../src/sim/construction';
import { stepColony, placementError } from '../src/sim/colony';
import { applyCommandAction } from '../src/sim/command';
import { applyResearch } from '../src/sim/research';
import { transferFreight } from '../src/sim/freight';
import { applyTowAction } from '../src/sim/towing';
import { applyCombatAction, stepCombat } from '../src/sim/combat';
import { stepCombatProjectiles } from '../src/sim/combatProjectiles';
import { stepDefence } from '../src/sim/defence';
import { advanceMeteor } from '../src/sim/meteor';
import { stepDrone } from '../src/sim/drones';
import { integrateVelocity } from '../src/sim/environment';
import { SHIP_WEAPONS, droneMass, type Drone } from '../src/sim/combatConfig';
import { TECH_IDS } from '../src/sim/progressionConfig';
import { habitatSource } from '../src/sim/habitats';
import { damageColony } from '../src/sim/buildingDamage';
import { stepShip } from '../src/sim/physics';
import { STEP, WORLD } from '../src/sim/config';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';
const idle = { thrust: false, turn: 0 };
const run = (w: ReturnType<typeof createWorld>, count: number) => { for (let i = 0; i < count; i++) stepWorld(w, idle, STEP); };
function fixture() {
  const w = createWorld(); w.asteroids = []; w.exploration.sites = []; w.system.time = 100;
  const site = colonyWorld(w, 'moon'), p = colonyPlanet(site); w.ship.position = surfacePosition(p, 0, 7); w.ship.velocity = { ...p.velocity }; w.ship.ground = 'moon';
  w.astronaut.position = surfacePosition(p, 0, 2.5); w.astronaut.velocity = { ...p.velocity };
  return { w, site, p };
}
describe('all actors and defenses in moving frames', () => {
  it('applies both sources to meteors and hostile rounds in vacuum', () => {
    const { w, p } = fixture(), position = surfacePosition(p, .5, 300), velocity = { ...p.velocity };
    const m = { id: w.nextId++, position: { ...position }, velocity: { ...velocity }, radius: 2, mass: 30, resource: 'iron' as const, stage: 0, health: 1, maxHealth: 1 };
    const expected = integrateVelocity(position, velocity, { x: 0, y: 0 }, m.mass, .47 * Math.PI * 4, STEP, w.system); advanceMeteor(m, STEP, w); expect(m.velocity).toEqual(expected);
    w.combat.projectiles.push({ id: w.nextId++, owner: 'enemy', kind: 'cannon', position: { ...position }, velocity: { ...velocity }, life: 5, targetId: null });
    const spec = SHIP_WEAPONS.cannon, v = integrateVelocity(position, velocity, { x: 0, y: 0 }, spec.mass, spec.mass * .00125, STEP, w.system);
    stepCombatProjectiles(w, STEP, { ship: w.ship.position, suit: w.astronaut.position, rocks: new Map(), meteors: new Map(), enemies: new Map() }); expect(w.combat.projectiles[0].velocity).toEqual(v);
  });
  it('predicts the same future moon-surface contact as the live integrator while sources move', () => {
    const { w, p } = fixture(); w.ship.state = 'flying'; w.ship.ground = undefined; w.ship.position = surfacePosition(p, 0, 150);
    const prediction = predictCoast(w.ship, 30, w.system); expect(prediction.contact).not.toBeNull();
    for (let i = 0; i < Math.round(prediction.seconds / STEP); i++) { stepShip(w.ship, idle, STEP, w.system); w.system.time += STEP; }
    expect(w.ship.position.x).toBeCloseTo(prediction.contact!.position.x, 6); expect(w.ship.position.y).toBeCloseTo(prediction.contact!.position.y, 6);
  });
  it('keeps missile steering invariant under a common launcher/target velocity boost', () => {
    const p = { x: 4, y: 8 }, t = { x: 100, y: -90 }, v = { x: 124, y: -96 }, reference = { x: 20, y: 10 }, boost = { x: 41, y: -12 };
    const a = pursuitAcceleration(p, v, t, 150, 100, reference), b = pursuitAcceleration(p, { x: v.x + boost.x, y: v.y + boost.y }, t, 150, 100, { x: reference.x + boost.x, y: reference.y + boost.y });
    expect(Math.abs(a.x)).toBeLessThan(50); expect(Math.abs(a.y)).toBeLessThan(50); expect(b.x).toBeCloseTo(a.x); expect(b.y).toBeCloseTo(a.y);
  });
  it('aims and launches automatic moon missiles relative to the moving turret, not the map origin', () => {
    const { w, site } = fixture(); w.system.time = Math.PI / (2 * ORBIT_RATE); const p = colonyPlanet(site);
    const turret = completedBuilding(1001, 'missile', 0, site); turret.turret = { aim: 0, cooldown: 0, automatic: true }; site.colony.buildings = [turret]; site.colony.nextId = 1002; site.colony.energy = 20; site.colony.products.alloy = 10; site.colony.products.components = 5;
    const m = { id: w.nextId++, position: surfacePosition(p, 0, 500), velocity: { x: p.velocity.x, y: p.velocity.y + 100 }, radius: 2, mass: 100, resource: 'iron' as const, stage: 0, health: 1, maxHealth: 1 }; w.defence.meteors = [m];
    stepWeapons(w, false, 0, STEP, new Map([[m.id, { ...m.position }]]));
    expect(w.defence.shots).toBe(1); expect(turret.turret.aim).toBeCloseTo(0); expect(w.defence.projectiles[0].frameVelocity).toEqual(p.velocity);
  });
  it('snapshots and restores the ship missile launch frame before recoil', () => {
    const { w, p } = fixture(); w.ship.state = 'flying'; w.ship.ground = undefined; w.ship.position = surfacePosition(p, 0, 300); w.ship.armament.selected = 'missile';
    const velocity = { ...w.ship.velocity }; stepCombat(w, true, STEP, { ship: w.ship.position, suit: w.astronaut.position, rocks: new Map(), meteors: new Map() });
    expect(w.combat.projectiles[0].frameVelocity).toEqual(velocity); expect(w.ship.velocity).not.toEqual(velocity);
    expect(decodeCheckpoint(encodeCheckpoint(w)).combat.projectiles[0].frameVelocity).toEqual(velocity);
  });
  it('keeps a dry drone ballistic under the same gravity rather than freezing its far-field motion', () => {
    const { w, p } = fixture(); w.ship.state = 'flying';
    const drone: Drone = { id: w.nextId++, position: surfacePosition(p, .3, 300), velocity: { ...p.velocity }, angle: 0, hull: 40, fuel: 0, ammo: 0, energy: 0, cooldown: 0, windup: 0, retreatTime: 0, state: 'retreat' };
    const expected = integrateVelocity(drone.position, drone.velocity, { x: 0, y: 0 }, droneMass(drone), 2, STEP, w.system); stepDrone(w, drone, STEP); expect(drone.velocity).toEqual(expected);
  });
  it('uses a remote emitter’s field, power and dust accounting without borrowing home protection', () => {
    const { w, site, p } = fixture(); w.colony.research.completed = [...TECH_IDS];
    const b = completedBuilding(1001, 'shieldLarge', 0, site); Object.assign(b.shield!, { charge: 360, ready: true, powered: true }); site.colony.buildings = [b]; site.colony.nextId = 1002;
    w.defence.meteors = [{ id: w.nextId++, position: surfacePosition(p, 0, 180), velocity: { x: p.velocity.x, y: p.velocity.y + 1500 }, radius: 2, mass: 20, stage: 0, resource: 'iron', health: 1, maxHealth: 1 }];
    stepDefence(w, false, 0, .2, { ...w.ship.position }); expect(w.defence.meteors).toHaveLength(0); expect(w.pickups).toHaveLength(0); expect(site.colony.shielding.hits).toBe(1); expect(site.colony.shielding.dustMass).toBe(20); expect(w.colony.shielding.hits).toBe(0);
  });
  it('anchors damage and habitat air to the moon and never gives oxygen from a shield', () => {
    const { w, site, p } = fixture(); w.playerMode = 'astronaut';
    const b = completedBuilding(1001, 'habitatSmall', 0, site); b.habitat!.oxygen = 1; b.habitat!.powered = true; site.colony.buildings = [b]; site.colony.nextId = 1002;
    expect(habitatSource(site)?.id).toBe(b.id); expect(habitatSource(w)).toBeUndefined();
    damageColony(w, surfacePosition(p, 0), 30, 10); expect(b.health).toBe(70); expect(w.colony.buildings).toHaveLength(0);
    b.enabled = false; expect(habitatSource(site)).toBeUndefined();
  });
  it('lets actual tow cargo cross remote shield coverage without deletion or free materials', () => {
    const { w, site, p } = fixture(); w.ship.state = 'flying'; w.ship.ground = undefined; w.ship.towRig = true; w.ship.position = surfacePosition(p, 0, 150);
    const rock = { id: w.nextId++, position: { x: w.ship.position.x + 50, y: w.ship.position.y }, velocity: { ...p.velocity }, radius: 5, mass: 40, resource: 'iron' as const, stage: 0, health: 1, maxHealth: 1 }; w.asteroids = [rock];
    const b = completedBuilding(1001, 'shieldLarge', 0, site); Object.assign(b.shield!, { charge: 360, powered: true, ready: true }); site.colony.buildings = [b]; site.colony.nextId = 1002; site.colony.energy = 20;
    applyTowAction(site, { type: 'toggleTow' }); expect(w.towing.targetId).toBe(rock.id); run(w, 60); expect(w.asteroids).toContain(rock); expect(rock.mass).toBe(40); expect(w.pickups).toHaveLength(0); expect(site.colony.shielding.hits).toBe(0);
  });
  it('keeps lost crew physical without granting oxygen, movement controls or a revival', () => {
    const { w, p } = fixture(); w.playerMode = 'astronaut'; w.astronaut.health = 0; w.astronaut.oxygen = 0;
    run(w, 60); expect(w.astronaut.health).toBe(0); expect(w.astronaut.oxygen).toBe(0);
    expect(Math.hypot(...Object.values(relative(w.astronaut.position, planetAt('moon', w.system))))).toBeCloseTo(452.5);
  });
  it('keeps unanchored wrecks ballistic and moves surface wrecks with their parent', () => {
    const { w, p } = fixture(); w.ship.state = 'crashed'; w.ship.ground = undefined; w.ship.position = surfacePosition(p, 0, 100);
    const before = { ...w.ship.position }; run(w, 10); expect(w.ship.position).not.toEqual(before); expect(w.ship.fuel).toBe(240);
    w.ship.ground = 'moon'; w.ship.position = surfacePosition(colonyPlanet(colonyWorld(w, 'moon')), 0, 7); run(w, 10); expect(Math.hypot(...Object.values(relative(w.ship.position, colonyPlanet(colonyWorld(w, 'moon')))))).toBeCloseTo(457);
  });
});
describe('remote operations and scarcity', () => {
  it('routes explicit remote orders to their own paid stocks and waits for a worker on that world', () => {
    const { w, site } = fixture(); w.playerMode = 'astronaut';
    stepWorld(w, { ...idle, colonyActions: [{ type: 'queueBuild', body: 'home', kind: 'solar', angle: .2 }] }, STEP);
    expect(w.colony.products.alloy).toBe(24); expect(site.colony.products.alloy).toBe(0); run(w, 600); expect(w.colony.command.queue[0].progress).toBe(0); expect(w.colony.buildings).toHaveLength(0);
  });
  it('keeps facility identities distinct across colonies after overlapping rebuild counters', () => {
    const { w, site } = fixture(); site.colony.buildings = [completedBuilding(1001, 'solar', .1, site)];
    w.colony.nextId = 1001; const id = allocateBuildingId(w); expect(id).toBe(1002); w.colony.buildings = [completedBuilding(id, 'solar', .1, w)];
    site.colony.nextId = 1002; expect(allocateBuildingId(site)).toBe(1003); expect(() => encodeCheckpoint(w)).not.toThrow();
  });
  it('funds only one shared research contributor per step, with paid takeover by a remote lab', () => {
    const { w, site } = fixture();
    for (const [view, first] of [[w, 1], [site, 1001]] as const) { view.colony.buildings = [completedBuilding(first, 'solar', .5, view), completedBuilding(first + 1, 'researchLab', .8, view)]; view.colony.nextId = first + 2; }
    applyResearch(w, { type: 'researchStart', tech: 'materials' }); run(w, 60); expect(w.colony.research.queue[0].progress).toBeCloseTo(1); expect(w.colony.research.energyUsed).toBeCloseTo(4);
    w.colony.buildings[1].enabled = false; run(w, 60); expect(w.colony.research.queue[0].progress).toBeCloseTo(2); expect(site.colony.research).toBe(w.colony.research); expect(site.colony.buildings[1].status).toBe('running');
  });
  it('refunds shared research to its original funding colony rather than the remote caller', () => {
    const { w, site } = fixture(); const original = w.colony.products.alloy;
    applyResearch(w, { type: 'researchStart', tech: 'materials' }); expect(w.colony.research.queue[0].funding).toBe('home');
    applyResearch(site, { type: 'researchControl', tech: 'materials', operation: 'cancel' }); expect(w.colony.products.alloy).toBe(original); expect(site.colony.products.alloy).toBe(0);
    site.colony.products.alloy = 4; site.colony.products.wire = 2; site.colony.products.components = 1;
    applyResearch(site, { type: 'researchStart', tech: 'materials' }); expect(w.colony.research.queue[0].funding).toBe('moon');
    applyResearch(w, { type: 'researchControl', tech: 'materials', operation: 'cancel' }); expect(site.colony.products.alloy).toBe(4); expect(w.colony.products.alloy).toBe(original);
  });
  it('blocks remote free fabrication, over-capacity freight and off-pad transfers', () => {
    const { w, site } = fixture(); transferFreight(site, 'alloy', 5); expect(w.ship.freight.alloy).toBe(0);
    w.ship.state = 'flying'; w.colony.products.alloy = 100; transferFreight(w, 'alloy', 5); expect(w.ship.freight.alloy).toBe(0);
    expect(placementError(site, 'solar', .5, { remote: true })).toContain('materials');
  });
  it('recovers at the moving home pad using home supplies and loses rather than teleports moon freight', () => {
    const { w, site } = fixture(); w.ship.state = 'crashed'; w.ship.freight.alloy = 7; const stock = w.colony.products.alloy; applyCombatAction(site, { type: 'recoverShip' });
    expect(w.ship.ground).toBe('home'); expect(w.ship.position).toEqual(surfacePosition(planetAt('home', w.system), 0, 7)); expect(w.ship.freight.alloy).toBe(0); expect(w.colony.products.alloy).toBe(stock - 8); expect(site.colony.products.alloy).toBe(0); expect(w.combat.lostCargo).toBe(7);
  });
  it('keeps interleaved worlds independent and reproduces exact continuation with remote production', () => {
    const { w, site } = fixture(); const copy = decodeCheckpoint(encodeCheckpoint(w)); w.notice = { ...copy.notice }; run(copy, 120);
    const unrelated = createWorld(); for (let i = 0; i < 120; i++) { stepWorld(w, idle, STEP); run(unrelated, 2); }
    expect(encodeCheckpoint(w)).toBe(encodeCheckpoint(copy));
  });
  it.each(['time', 'body', 'freight', 'capacity', 'moon stocks', 'moon seam', 'research', 'attachment', 'view metadata', 'missile frame'])('rejects malformed current %s state', field => {
    const { w } = fixture(), data = JSON.parse(encodeCheckpoint(w));
    if (field === 'time') data.world.system.time = -1;
    if (field === 'body') data.world.ship.ground = 'unknown';
    if (field === 'freight') data.world.ship.freight.alloy = -1;
    if (field === 'capacity') { data.world.ship.freight.alloy = 100; data.world.ship.cargo.iron = 100; }
    if (field === 'moon stocks') data.world.outposts.moon.colony.products.alloy = 101;
    if (field === 'moon seam') data.world.outposts.moon.surfaceDeposits[0].remaining = 181;
    if (field === 'research') data.world.outposts.moon.colony.research.completed = ['materials'];
    if (field === 'missile frame') { data.world.combat.projectiles = [{ id: data.world.nextId++, owner: 'ship', kind: 'missile', position: data.world.ship.position, velocity: data.world.ship.velocity, life: 12, targetId: null, frameVelocity: { x: null, y: 0 } }]; }
    if (field === 'view metadata') data.world.rootWorld = {};
    if (field === 'attachment') data.world.ship.position.x = 0;
    expect(() => decodeCheckpoint(JSON.stringify(data))).toThrow();
  });
});
