import { planetAt, relative, surfacePosition } from '../src/sim/celestial';
import { describe, expect, it } from 'vitest';
import { createAstronaut, stepAstronaut, suitAltitude, SUIT } from '../src/sim/astronaut';
import { FixedClock } from '../src/sim/clock';
import { ATMOSPHERE, STEP, WORLD } from '../src/sim/config';
import { dot, heading, length, localAngle } from '../src/sim/math';
import { inventoryMass } from '../src/sim/resources';
import { boardOrExit, interactSurface, stationPosition, STATIONS } from '../src/sim/surface';
import { createWorld, stepWorld } from '../src/sim/world';

describe('astronaut physics and safety', () => {
  it.each([0, Math.PI / 2, Math.PI, -Math.PI / 2])('walks on the circular rim at angle %s without sinking', angle => {
    const suit = createAstronaut(), n = heading(angle);
    suit.position = { x: n.x * (WORLD.radius + SUIT.radius), y: n.y * (WORLD.radius + SUIT.radius) };
    for (let i = 0; i < 600; i++) stepAstronaut(suit, { move: 1, jump: false }, STEP);
    expect(length(suit.position)).toBeCloseTo(WORLD.radius + SUIT.radius, 9);
    const expected = angle + (10 - 0.1916666667) * SUIT.walkSpeed / (WORLD.radius + SUIT.radius);
    expect(Math.sin(localAngle(suit.position))).toBeCloseTo(Math.sin(expected), 5);
    expect(suit.grounded).toBe(true); expect(dot(suit.position, suit.velocity)).toBeCloseTo(0, 7);
  });
  it('brakes tangential motion on the ground and preserves it in a jump', () => {
    const suit = createAstronaut();
    for (let i = 0; i < 60; i++) stepAstronaut(suit, { move: 1, jump: false }, STEP);
    expect(length(suit.velocity)).toBeCloseTo(SUIT.walkSpeed);
    for (let i = 0; i < 60; i++) stepAstronaut(suit, { move: 0, jump: false }, STEP);
    expect(length(suit.velocity)).toBe(0);
    stepAstronaut(suit, { move: 1, jump: true }, STEP);
    expect(suit.grounded).toBe(false); expect(suitAltitude(suit)).toBeGreaterThan(0);
  });
  it('lands a normal jump safely and requires release before jumping again', () => {
    const suit = createAstronaut(); let maximum = 0;
    for (let i = 0; i < 600; i++) { stepAstronaut(suit, { move: 0, jump: true }, STEP); maximum = Math.max(maximum, suitAltitude(suit)); }
    expect(maximum).toBeGreaterThan(10); expect(suit.grounded).toBe(true); expect(suit.health).toBe(100);
    stepAstronaut(suit, { move: 0, jump: false }, STEP); stepAstronaut(suit, { move: 0, jump: true }, STEP);
    expect(suit.grounded).toBe(false);
  });
  it('sweeps a hard fall against the surface and damages the suit', () => {
    const suit = createAstronaut(); suit.grounded = false; suit.position.y = -WORLD.radius - ATMOSPHERE.height - 1000; suit.velocity.y = 600000;
    stepAstronaut(suit, { move: 0, jump: false }, STEP);
    expect(length(suit.position)).toBeCloseTo(WORLD.radius + SUIT.radius); expect(suit.health).toBe(0);
    expect(suit.velocity).toEqual({ x: 0, y: 0 });
  });
  it('consumes oxygen in seconds and applies bounded health loss after depletion', () => {
    const suit = createAstronaut(); suit.oxygen = 0.5;
    for (let i = 0; i < 120; i++) stepAstronaut(suit, { move: 0, jump: false }, STEP);
    expect(suit.oxygen).toBe(0); expect(suit.health).toBeCloseTo(92.5);
  });
  it('has identical results through the fixed clock at 30 and 144 Hz', () => {
    const run = (hz: number) => {
      const suit = createAstronaut(), clock = new FixedClock();
      for (let i = 0; i < hz * 10; i++) clock.advance(1 / hz, dt => stepAstronaut(suit, { move: 1, jump: i < hz }, dt));
      return suit;
    };
    expect(run(30)).toEqual(run(144));
  });
});
describe('boarding, controls and surface services', () => {
  it('exits/boards only a landed nearby ship and debounces a held F', () => {
    const world = createWorld();
    stepWorld(world, { thrust: false, turn: 0, board: true }, STEP);
    expect(world.playerMode).toBe('astronaut');
    for (let i = 0; i < 20; i++) stepWorld(world, { thrust: false, turn: 0, board: true }, STEP);
    expect(world.playerMode).toBe('astronaut');
    stepWorld(world, { thrust: false, turn: 0 }, STEP);
    stepWorld(world, { thrust: false, turn: 0, board: true }, STEP);
    expect(world.playerMode).toBe('ship');
    world.ship.state = 'flying'; boardOrExit(world); expect(world.playerMode).toBe('ship');
    world.ship.state = 'landed'; boardOrExit(world); world.astronaut.position = stationPosition(1);
    boardOrExit(world); expect(world.playerMode).toBe('astronaut');
  });
  it('keeps the world running while disabling unoccupied ship systems', () => {
    const world = createWorld(); boardOrExit(world);
    const shipPosition = { ...world.ship.position }, asteroidPosition = { ...world.asteroids[0].position };
    for (let i = 0; i < 60; i++) stepWorld(world, { thrust: true, turn: 1, mine: true, tractor: true }, STEP);
    expect(world.ship.position).toEqual(surfacePosition(planetAt('home', world.system), 0, WORLD.shipRadius)); expect(world.ship.fuel).toBe(WORLD.fuelCapacity);
    expect(world.beam).toBeNull(); expect(world.tractorActive).toBe(false);
    expect(world.asteroids[0].position).not.toEqual(asteroidPosition); expect(world.astronaut.oxygen).toBeCloseTo(179);
  });
  it('opens the nearby depot and unloads without duplicating cargo; remote and airborne use fail', () => {
    const world = createWorld(); world.ship.cargo.iron = 20; boardOrExit(world);
    interactSurface(world); expect(world.depotOpen).toBe(false); expect(inventoryMass(world.ship.cargo)).toBe(20);
    world.astronaut.position = stationPosition(STATIONS[0].angle); world.astronaut.grounded = false;
    interactSurface(world); expect(world.depotOpen).toBe(false);
    world.astronaut.grounded = true; interactSurface(world);
    expect(world.depotOpen).toBe(true); expect(world.depot.iron).toBe(20); expect(inventoryMass(world.ship.cargo)).toBe(0);
    interactSurface(world); interactSurface(world); expect(world.depot.iron).toBe(20);
  });
  it('services the suit and spends only available stored iron on hull repair', () => {
    const world = createWorld(); boardOrExit(world); world.astronaut.position = stationPosition(STATIONS[1].angle);
    world.astronaut.oxygen = 10; world.astronaut.health = 40; world.ship.hull = 65; world.depot.iron = 2;
    interactSurface(world);
    expect(world.astronaut.oxygen).toBe(SUIT.oxygen); expect(world.astronaut.health).toBe(100);
    expect(world.ship.hull).toBe(85); expect(world.depot.iron).toBe(0);
    world.depot.iron = 10; interactSurface(world); expect(world.ship.hull).toBe(100); expect(world.depot.iron).toBe(8.5);
    interactSurface(world); expect(world.depot.iron).toBe(8.5);
  });
  it('refills oxygen on boarding, and a lost suit requires a reset', () => {
    const world = createWorld(); boardOrExit(world); world.astronaut.oxygen = 0;
    boardOrExit(world); expect(world.astronaut.oxygen).toBe(SUIT.oxygen);
    boardOrExit(world); world.astronaut.health = 0; boardOrExit(world); expect(world.playerMode).toBe('astronaut');
    expect(createWorld().astronaut).toEqual({ ...createAstronaut(), velocity: planetAt('home', createWorld().system).velocity });
  });
  it('walks to the depot, transfers a delivered hold, returns to board and launches', () => {
    const world = createWorld(); world.ship.cargo.copper = 16;
    stepWorld(world, { thrust: false, turn: 0, board: true }, STEP);
    for (let i = 0; i < 200; i++) stepWorld(world, { thrust: false, turn: 1 }, STEP);
    for (let i = 0; i < 30; i++) stepWorld(world, { thrust: false, turn: 0 }, STEP);
    stepWorld(world, { thrust: false, turn: 0, unload: true }, STEP);
    expect(world.depot.copper).toBe(16); expect(world.depotOpen).toBe(true);
    for (let i = 0; i < 220; i++) stepWorld(world, { thrust: false, turn: -1 }, STEP);
    for (let i = 0; i < 30; i++) stepWorld(world, { thrust: false, turn: 0 }, STEP);
    stepWorld(world, { thrust: false, turn: 0, board: true }, STEP); expect(world.playerMode).toBe('ship');
    stepWorld(world, { thrust: true, turn: 0 }, STEP); expect(world.ship.state).toBe('flying');
  });
});
