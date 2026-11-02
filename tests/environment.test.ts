import { shipMass } from '../src/sim/shipMass';
import { describe, expect, it } from 'vitest';
import { ATMOSPHERE, STEP, WORLD } from '../src/sim/config';
import { airDensity, applyAirDrag, gravity } from '../src/sim/environment';
import { length, dot } from '../src/sim/math';
import { createShip, IDLE, stepShip } from '../src/sim/physics';
import { createAstronaut, stepAstronaut } from '../src/sim/astronaut';
import { moveBody, collideShip, type Asteroid } from '../src/sim/bodies';
import { tractor } from '../src/sim/mining';

describe('shared planetary environment', () => {
  it('keeps surface gravity at 5 m/s², bounds the interior, and has an inverse-square exterior', () => {
    expect(WORLD.radius).toBe(1800);
    expect(length(gravity({ x: WORLD.radius, y: 0 }))).toBeCloseTo(5);
    expect(length(gravity({ x: WORLD.radius / 2, y: 0 }))).toBeCloseTo(2.5);
    expect(length(gravity({ x: WORLD.radius * 2, y: 0 }))).toBeCloseTo(1.25);
    expect(length(gravity({ x: 0, y: 0 }))).toBe(0);
  });
  it('tapers density continuously to a true vacuum over a substantial flight region', () => {
    const density = (height: number) => airDensity({ x: 0, y: -WORLD.radius - height });
    expect(ATMOSPHERE.height).toBe(1200); expect(density(0)).toBe(ATMOSPHERE.surfaceDensity);
    expect(density(300)).toBeGreaterThan(density(600)); expect(density(600)).toBeGreaterThan(density(1000));
    expect(density(ATMOSPHERE.height - 0.01)).toBeLessThan(1e-10);
    expect(density(ATMOSPHERE.height)).toBe(0); expect(density(5000)).toBe(0);
  });
  it('drag always dissipates kinetic energy without reversing even an extreme velocity', () => {
    const position = { x: 0, y: -WORLD.radius - 10 }, velocity = { x: 400000, y: -300000 };
    const next = applyAirDrag(position, velocity, 100, 10, 1000);
    expect(length(next)).toBeLessThan(length(velocity)); expect(dot(next, velocity)).toBeGreaterThan(0);
    expect(next.x * velocity.y - next.y * velocity.x).toBeCloseTo(0, 4);
    const heavy = applyAirDrag(position, velocity, 1000, 10, 1000); expect(length(heavy)).toBeGreaterThan(length(next));
    expect(applyAirDrag({ x: 0, y: -WORLD.radius - ATMOSPHERE.height }, velocity, 100, 10, 1000)).toEqual(velocity);
  });
  it('applies the same vacuum gravity to ship, astronaut and mineral bodies regardless of mass', () => {
    const position = { x: 0, y: -WORLD.radius - ATMOSPHERE.height - 1000 };
    const ship = createShip(); ship.state = 'flying'; ship.position = { ...position };
    const suit = createAstronaut(); suit.position = { ...position }; suit.grounded = false;
    const body = { id: 1, position: { ...position }, velocity: { x: 0, y: 0 }, mass: 2, radius: 1, resource: 'iron' as const };
    stepShip(ship, IDLE, STEP); stepAstronaut(suit, { move: 0, jump: false }, STEP); moveBody(body, STEP);
    expect(ship.velocity).toEqual(suit.velocity); expect(ship.velocity).toEqual(body.velocity);
    expect(ship.position).toEqual(suit.position); expect(ship.position).toEqual(body.position);
  });
  it('preserves orbital energy and angular momentum over a vacuum orbit', () => {
    const radius = WORLD.radius + ATMOSPHERE.height + 500, ship = createShip();
    ship.state = 'flying'; ship.position = { x: 0, y: -radius }; ship.velocity.x = Math.sqrt(WORLD.mu / radius);
    const energy = () => dot(ship.velocity, ship.velocity) / 2 - WORLD.mu / length(ship.position);
    const momentum = () => ship.position.x * ship.velocity.y - ship.position.y * ship.velocity.x;
    const initialEnergy = energy(), initialMomentum = momentum(); let error = 0;
    const steps = Math.ceil(2 * Math.PI * Math.sqrt(radius ** 3 / WORLD.mu) / STEP);
    for (let i = 0; i < steps; i++) { stepShip(ship, IDLE, STEP); error = Math.max(error, Math.abs((energy() - initialEnergy) / initialEnergy)); }
    expect(error).toBeLessThan(1e-5); expect(momentum() / initialMomentum).toBeCloseTo(1, 10);
  });
});
describe('contact and powered interaction invariants', () => {
  it('gives the ship the equal/opposite tractor impulse and conserves capture momentum', () => {
    const ship = createShip(); ship.state = 'flying'; ship.position.y -= 100;
    const pickup = { id: 1, mass: 10, radius: 2, resource: 'iron' as const, position: { x: 100, y: ship.position.y }, velocity: { x: 20, y: 0 } };
    const mass = shipMass(ship);
    tractor(ship, pickup, STEP);
    expect(ship.velocity.x * mass + pickup.velocity.x * pickup.mass).toBeCloseTo(200, 8);
    pickup.position = { ...ship.position }; tractor(ship, pickup, STEP);
    expect(ship.velocity.x * (mass + ship.cargo.iron)).toBeCloseTo(200, 8); expect(pickup.mass).toBe(0);
  });
  it('conserves momentum and dissipates energy for a nonfatal ship/rock collision', () => {
    const y = -WORLD.radius - ATMOSPHERE.height - 1000, ship = createShip(); ship.state = 'flying';
    ship.position = { x: -20, y }; ship.velocity = { x: 10, y: 2 };
    const rock: Asteroid = { id: 1, position: { x: 0, y }, velocity: { x: -1, y: -0.5 }, radius: 16, mass: 40, resource: 'iron', stage: 0, health: 1, maxHealth: 1 };
    const mass = shipMass(ship);
    const before = { x: ship.velocity.x * mass + rock.velocity.x * rock.mass, y: ship.velocity.y * mass + rock.velocity.y * rock.mass };
    const energy = () => mass * dot(ship.velocity, ship.velocity) / 2 + rock.mass * dot(rock.velocity, rock.velocity) / 2;
    const initialEnergy = energy(); collideShip(ship, rock, { x: -24, y }, { ...rock.position });
    expect(ship.state).toBe('flying'); expect(ship.velocity.x * mass + rock.velocity.x * rock.mass).toBeCloseTo(before.x, 8);
    expect(ship.velocity.y * mass + rock.velocity.y * rock.mass).toBeCloseTo(before.y, 8); expect(energy()).toBeLessThan(initialEnergy);
  });
});
