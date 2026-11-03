import { describe, it, expect } from 'vitest';
import { CELESTIAL, ORBIT_RATE, SEPARATION, planetAt, planets, relative, relativeVelocity, surfacePosition, terrainHit, STATIC_SYSTEM } from '../src/sim/celestial';
import { gravity, airDensity, applyAirDrag } from '../src/sim/environment';
import { createWorld, stepWorld, unloadCargo } from '../src/sim/world';
import { colonyWorld, activeWorld, colonyPlanet } from '../src/sim/localWorld';
import { transferFreight, loadDepotOre } from '../src/sim/freight';
import { shipMass, cargoMass } from '../src/sim/shipMass';
import { telemetry, stepShip } from '../src/sim/physics';
import { STEP, WORLD } from '../src/sim/config';
import { boardOrExit } from '../src/sim/surface';
import { completedBuilding } from '../src/sim/construction';
import { applyColonyAction } from '../src/sim/colony';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';
import { TestPilot } from './helpers/pilot';
const idle = { thrust: false, turn: 0 };
const run = (w: ReturnType<typeof createWorld>, seconds: number) => { for (let i = 0; i < Math.round(seconds / STEP); i++) stepWorld(w, idle, STEP); };
function moonFixture() {
  const w = createWorld(); w.asteroids = []; w.exploration.sites = []; const moon = planetAt('moon', w.system);
  w.ship.position = surfacePosition(moon, 0, WORLD.shipRadius); w.ship.velocity = { ...moon.velocity }; w.ship.state = 'landed'; w.ship.ground = 'moon';
  return { w, site: colonyWorld(w, 'moon') };
}
function fly(w: ReturnType<typeof createWorld>, id: 'home' | 'moon', height: number, limit = 180, angle = 0, cadence = 6) {
  const pilot = new TestPilot(); let input = idle;
  for (let i = 0; i < limit / STEP; i++) {
    const planet = planetAt(id, w.system), target = { position: surfacePosition(planet, angle, height), velocity: planet.velocity };
    const delta = Math.hypot(w.ship.position.x - target.position.x, w.ship.position.y - target.position.y), dv = Math.hypot(w.ship.velocity.x - planet.velocity.x, w.ship.velocity.y - planet.velocity.y);
    if (i > 10 && (height === WORLD.shipRadius ? w.ship.state === 'landed' && w.ship.ground === id : delta < 5 && dv < 2)) return;
    if (i % cadence === 0) input = pilot.input(w.ship, target, w.system, STEP * cadence);
    stepWorld(w, input, STEP);
    if (w.ship.state === 'crashed') throw new Error(`Crash approaching ${id} at ${height}: ${JSON.stringify(telemetry(w.ship, 7, w.system))}`);
  }
  throw new Error(`Transfer timeout ${id}/${height}: ${JSON.stringify({ time: w.system.time, ship: w.ship.position, velocity: w.ship.velocity, data: telemetry(w.ship, 7, w.system), fuel: w.ship.fuel })}`);
}

describe('continuous binary-world physics', () => {
  it('preserves separation, shared barycentre and analytic source velocities over a full orbit', () => {
    for (const time of [0, 100, Math.PI / ORBIT_RATE, 2 * Math.PI / ORBIT_RATE]) {
      const system = { time, binary: true }, a = planetAt('home', system), b = planetAt('moon', system);
      expect(Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y)).toBeCloseTo(SEPARATION);
      expect((a.position.x * a.mu + b.position.x * b.mu) / (a.mu + b.mu)).toBeCloseTo(SEPARATION * b.mu / (a.mu + b.mu));
      expect(a.velocity.x * a.mu + b.velocity.x * b.mu).toBeCloseTo(0, 6);
    }
  });
  it('sums finite gravity at both cores and matches the one-source inverse-square limit', () => {
    const system = { time: 100, binary: true };
    for (const p of planets(system)) expect(Object.values(gravity(p.position, system)).every(Number.isFinite)).toBe(true);
    const home = planetAt('home', STATIC_SYSTEM); expect(gravity(surfacePosition(home, 0), STATIC_SYSTEM).y).toBeCloseTo(5);
    expect(gravity(planetAt('moon', system).position, system).x).not.toBe(0);
  });
  it('moves air with home and leaves the moon airless', () => {
    const system = { time: 40, binary: true }, home = planetAt('home', system), moon = planetAt('moon', system);
    expect(applyAirDrag(surfacePosition(home, 0, 50), home.velocity, 100, 10, 1, system)).toEqual(home.velocity);
    expect(airDensity(surfacePosition(moon, 0, 5), system)).toBe(0);
  });
  it('sweeps fast contacts against moving home and moon without tunnelling', () => {
    const system = { time: 30, binary: true };
    for (const p of planets(system)) {
      const hit = terrainHit(surfacePosition(p, 0, 100), surfacePosition(planetAt(p.id, { ...system, time: 31 }), 0, -100), 7, system, 1);
      expect(hit?.planet.id).toBe(p.id); expect(hit!.t).toBeGreaterThan(0); expect(hit!.t).toBeLessThan(1);
    }
  });
  it('keeps a parked ship and grounded crew with a moving moon and transfers its surface velocity on launch', () => {
    const { w, site } = moonFixture(); run(w, 5); expect(telemetry(w.ship, 7, w.system).speed).toBeCloseTo(0);
    boardOrExit(site); run(w, 1); expect(Math.hypot(...Object.values(relativeVelocity(w.astronaut.velocity, colonyPlanet(site))))).toBeCloseTo(0);
    expect(Math.hypot(...Object.values(relative(w.astronaut.position, colonyPlanet(site))))).toBeCloseTo(452.5);
    boardOrExit(site); const before = { ...w.ship.velocity }; stepWorld(w, { thrust: true, turn: 0 }, STEP); expect(w.ship.state).toBe('flying'); expect(Math.abs(w.ship.velocity.x - before.x)).toBeLessThan(1);
  });
});

describe('supplied local colonies and freight', () => {
  it('starts the moon empty and conserves manufactured stock, total hold capacity and ship mass', () => {
    const w = createWorld(), before = shipMass(w.ship); expect(w.moon.colony.products.alloy).toBe(0); expect(w.moon.colony.buildings).toHaveLength(0);
    transferFreight(w, 'alloy', 5); expect(w.colony.products.alloy).toBe(23); expect(shipMass(w.ship) - before).toBe(5);
    w.ship.cargo.iron = 114; transferFreight(w, 'alloy', 5); expect(cargoMass(w.ship)).toBe(120); expect(w.ship.freight.alloy).toBe(6);
    const { w: remote, site } = moonFixture(); remote.ship.freight.alloy = 5; const home = remote.colony.products.alloy; transferFreight(site, 'alloy', -5); expect(site.colony.products.alloy).toBe(5); expect(remote.colony.products.alloy).toBe(home);
  });
  it('processes a remote rig while home is selected and never borrows home energy or materials', () => {
    const { w, site } = moonFixture(), seam = site.surfaceDeposits[0];
    site.colony.buildings = [completedBuilding(1001, 'miningRig', seam.angle, site), completedBuilding(1002, 'solar', 1, site)]; site.colony.nextId = 1003;
    run(w, 4); expect(site.depot.ice).toBe(1); expect(w.depot.ice).toBe(0); expect(seam.remaining).toBe(179); expect(w.colony.energy).toBe(0);
    site.colony.buildings[1].enabled = false; site.colony.energy = 0; w.colony.energy = 20; run(w, 2); expect(site.depot.ice).toBe(1); expect(w.colony.energy).toBe(20);
    loadDepotOre(site, 'ice'); expect(w.ship.cargo.ice).toBe(1); expect(site.depot.ice).toBe(0);
  });
  it('preserves both colonies, freight, research identity and the exact moving-frame continuation', () => {
    const { w, site } = moonFixture(); w.ship.freight.wire = 7; site.colony.products.alloy = 5; run(w, 2);
    const loaded = decodeCheckpoint(encodeCheckpoint(w)); expect(loaded.moon.colony.research).toBe(loaded.colony.research);
    run(w, 2); run(loaded, 2); expect(loaded.ship).toEqual(w.ship); expect(loaded.moon).toEqual(w.moon); expect(loaded.system).toEqual(w.system);
  });
  it('flies from home to the moon, lands, returns and lands at home using only normal thrust and rotation', () => {
    const w = createWorld(); w.asteroids = []; w.exploration.sites = [];
    for (let i = 0; i < 3; i++) transferFreight(w, 'alloy', 5); transferFreight(w, 'wire', 5); transferFreight(w, 'components', 5);
    fly(w, 'home', 1500); fly(w, 'moon', 150); fly(w, 'moon', 7, 90);
    expect(activeWorld(w).siteBody).toBe('moon'); expect(w.ship.hull).toBe(100); const fuel = w.ship.fuel;
    const site = colonyWorld(w, 'moon'); for (let i = 0; i < 3; i++) transferFreight(site, 'alloy', -5); transferFreight(site, 'wire', -5); transferFreight(site, 'components', -5);
    boardOrExit(site);
    const arc = () => Math.atan2(relative(w.astronaut.position, colonyPlanet(site)).x, -relative(w.astronaut.position, colonyPlanet(site)).y) * 450;
    for (let i = 0; i < 1200 && arc() < 120; i++) stepWorld(w, { thrust: false, turn: 1 }, STEP); run(w, .6);
    site.colony.buildOpen = true; site.colony.selected = 'miningRig'; site.colony.offset = 32; applyColonyAction(site, { type: 'place' });
    site.colony.selected = 'solar'; site.colony.offset = 64; applyColonyAction(site, { type: 'place' }); expect(site.colony.buildings).toHaveLength(2); site.colony.buildOpen = false;
    run(w, 8); expect(site.depot.ice).toBeGreaterThan(0); expect(w.depot.ice).toBe(0);
    for (let i = 0; i < 1200 && arc() > 8; i++) stepWorld(w, { thrust: false, turn: -1 }, STEP); run(w, .6); boardOrExit(site); expect(w.playerMode).toBe('ship');
    loadDepotOre(site, 'ice'); const carried = w.ship.cargo.ice; expect(carried).toBeGreaterThan(0);

    fly(w, 'moon', 1000);
    const p = relative(w.ship.position, planetAt('home', w.system)); let angle = Math.atan2(p.x, -p.y);
    fly(w, 'home', 3500, 180, angle);
    while (Math.abs(angle) > .01) { angle -= Math.sign(angle) * Math.min(Math.PI / 4, Math.abs(angle)); fly(w, 'home', 3500, 120, angle); }
    fly(w, 'home', 1500); fly(w, 'home', 7, 600);
    unloadCargo(w); expect(w.depot.ice).toBe(carried); expect(w.ship.cargo.ice).toBe(0);
    expect(w.ship.ground).toBe('home'); expect(w.ship.fuel).toBeLessThan(fuel); expect(w.ship.hull).toBe(100);
  }, 30000);
});
