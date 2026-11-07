import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { tripFuel } from '../src/sim/tripFuel';
import { mapView } from '../src/ui/map/mapView';
import { colonyWorld } from '../src/sim/localWorld';
import { completedBuilding } from '../src/sim/construction';
import { groundVelocity, planetAt, surfacePosition } from '../src/sim/celestial';

describe('fuel for a trip and refuelling far from home', () => {
  it('estimates the fuel for leaving, matching speed and landing, and the Map shows it against what you have', () => {
    const w = createWorld();
    const moon = tripFuel(w, 'moon');
    const frost = tripFuel(w, 'frost');
    const cinder = tripFuel(w, 'cinder');
    expect(moon.kg).toBeGreaterThan(0);
    // Climbing out of Selene costs the most; matching an orbiting belt adds its speed; landing on a world adds its own climb.
    expect(frost.dv).toBeGreaterThan(134);
    expect(moon.dv).toBeGreaterThan(cinder.dv);
    expect(cinder.kg).toBeGreaterThan(0);
    w.exploration.selected = 'moon';
    w.exploration.known.push('moon');
    const fact = mapView(w).selected.facts.find(f => f[0] === 'Fuel for the trip');
    expect(fact?.[1]).toMatch(/about \d+ kg \(you have 240\)/);
  });

  it('a lander on another world\'s pad takes fuel from that world\'s stores with E', async () => {
    const { stepWorld } = await import('../src/sim/world');
    const w = createWorld();
    const body = planetAt('moon', w.system);
    w.ship.position = surfacePosition(body, 0, 7);
    w.ship.velocity = { ...groundVelocity(body, w.ship.position) };
    w.ship.state = 'landed';
    w.ship.ground = 'moon';
    w.ship.fuel = 100;
    const moon = colonyWorld(w, 'moon');
    moon.colony.products.fuel = 30;
    moon.colony.buildings.push(completedBuilding(1001, 'fuelProcessor', 0.3, moon));
    stepWorld(w, { thrust: false, turn: 0, unload: true }, 1 / 60);
    expect(w.ship.fuel).toBeCloseTo(130, 6);
    expect(moon.colony.products.fuel).toBeCloseTo(0, 6);
    expect(w.colony.products.fuel).toBe(createWorld().colony.products.fuel);
  });
});
