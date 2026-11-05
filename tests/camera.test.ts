import { describe, expect, it } from 'vitest';
import {
  FlightCamera,
  usableDepth,
  SHIP_ART_HEIGHT,
  SHIP_SCREEN_FRACTION,
  SUIT_ART_HEIGHT,
  SUIT_SCREEN_FRACTION,
  groundInViewZoom,
  groundUrgency,
  framingZoom,
  groundZoom,
} from '../src/render/camera';
import { createShip } from '../src/sim/physics';
import { planetAt, surfacePosition } from '../src/sim/celestial';
import { ATMOSPHERE, WORLD } from '../src/sim/config';
import { wrap } from '../src/sim/math';

const settle = (camera: FlightCamera, target: { position: { x: number; y: number }; velocity?: { x: number; y: number } }, seconds = 10, onFoot = false) => {
  for (let i = 0; i < seconds * 60; i++) camera.update(target, 1 / 60, onFoot);
};

/** A lander hovering straight above the pad at the given altitude, moving at the given speed (m/s, +up). */
function lander(altitude: number, climb = 0) {
  const ship = createShip();
  const planet = planetAt('home', { time: 0, binary: false });
  ship.position = surfacePosition(planet, 0, WORLD.shipRadius + altitude);
  ship.velocity = { x: planet.velocity.x, y: planet.velocity.y - climb };
  return ship;
}

describe('camera scale', () => {
  it('draws the lander and the astronaut at a fixed share of screen height, on any window', () => {
    for (const height of [600, 800, 900, 1080, 1440]) {
      const ship = groundZoom(height, false) * SHIP_ART_HEIGHT;
      const suit = groundZoom(height, true) * SUIT_ART_HEIGHT;
      expect(ship / height).toBeCloseTo(SHIP_SCREEN_FRACTION, 2);
      expect(suit / height).toBeCloseTo(SUIT_SCREEN_FRACTION, 2);
    }
  });

  it('makes the lander large enough to read: at least 55 px tall at 900 px', () => {
    expect(groundZoom(900, false) * SHIP_ART_HEIGHT).toBeGreaterThanOrEqual(55);
    expect(groundZoom(900, true) * SUIT_ART_HEIGHT).toBeGreaterThanOrEqual(28);
  });

  it('starts at ground zoom for the current window', () => {
    const camera = new FlightCamera();
    camera.viewportHeight = 1080;
    camera.reset(createShip());
    expect(camera.zoom).toBeCloseTo(groundZoom(1080, false));
  });
});

describe('ground stays in view while descending', () => {
  it('never zooms in past the point where the ground below the lander is on screen, once contact is near', () => {
    for (const height of [600, 900, 1080]) {
      // At 25 m/s, anything at or under 175 m is within 7 seconds of contact.
      for (const altitude of [30, 80, 150, 170]) {
        const camera = new FlightCamera();
        camera.viewportHeight = height;
        const ship = lander(altitude, -25);
        camera.reset(ship);
        settle(camera, ship, 8);
        // Metres of clear screen below the focus point (not under the instrument cluster).
        const below = usableDepth(height) / camera.zoom;
        expect(below, `${height}px at ${altitude} m`).toBeGreaterThan(altitude);
      }
    }
  });

  it('does not zoom out for a slow drift far from the ground, such as while mining', () => {
    const drifting = new FlightCamera();
    drifting.viewportHeight = 900;
    const ship = lander(260, -6);
    drifting.reset(ship);
    settle(drifting, ship, 8);
    expect(drifting.zoom).toBeGreaterThan(groundInViewZoom(900, 260) * 2);
    expect(groundUrgency(260, 6)).toBe(0);
    expect(groundUrgency(100, 0)).toBe(1);
    expect(groundUrgency(300, 60)).toBe(1);
    const mid = groundUrgency(300, 25);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });

  it('zooms in for the landing: the lander is big again once it is close to the ground', () => {
    const camera = new FlightCamera();
    camera.viewportHeight = 900;
    const ship = lander(25, -3);
    camera.reset(ship);
    settle(camera, ship, 8);
    expect((camera.zoom * SHIP_ART_HEIGHT) / 900).toBeGreaterThan(0.05);
  });

  it('lets a climbing lander zoom out freely instead of holding the ground in view', () => {
    const climbing = new FlightCamera();
    const falling = new FlightCamera();
    for (const camera of [climbing, falling]) camera.viewportHeight = 900;
    const up = lander(400, 30);
    const down = lander(400, -30);
    climbing.reset(up);
    falling.reset(down);
    settle(climbing, up, 8);
    settle(falling, down, 8);
    expect(climbing.zoom).toBeGreaterThan(falling.zoom);
  });

  it('exposes the rule it uses', () => {
    expect(groundInViewZoom(900, 100)).toBeCloseTo(usableDepth(900) / 125);
    expect(groundInViewZoom(900, -5)).toBeGreaterThan(0);
  });
});

describe('look-ahead', () => {
  it('leads in the direction of travel, up to a fraction of the screen', () => {
    const camera = new FlightCamera();
    camera.viewportHeight = 900;
    const ship = lander(300, 0);
    ship.velocity.x += 40;
    camera.reset(ship);
    settle(camera, ship, 6);
    expect(camera.lead.x).toBeGreaterThan(5);
    expect(Math.hypot(camera.lead.x, camera.lead.y)).toBeLessThanOrEqual((0.2 * 900) / camera.zoom + 1e-6);
    expect(camera.x).toBeGreaterThan(ship.position.x);
  });

  it('has no lead when sitting on the pad, on foot, or with reduced motion', () => {
    const still = lander(0, 0);
    const camera = new FlightCamera();
    camera.reset(still);
    settle(camera, still, 3);
    expect(Math.hypot(camera.lead.x, camera.lead.y)).toBeLessThan(1e-6);

    const moving = lander(300, 0);
    moving.velocity.x += 40;
    const walker = new FlightCamera();
    walker.reset(moving);
    settle(walker, moving, 4, true);
    expect(Math.hypot(walker.lead.x, walker.lead.y)).toBeLessThan(1e-6);

    const calm = new FlightCamera();
    calm.reducedMotion = true;
    calm.reset(moving);
    settle(calm, moving, 4);
    expect(Math.hypot(calm.lead.x, calm.lead.y)).toBeLessThan(1e-6);
  });

  it('eases in rather than jumping', () => {
    const camera = new FlightCamera();
    const ship = lander(300, 0);
    camera.reset(ship);
    ship.velocity.x += 40;
    camera.update(ship, 1 / 60);
    expect(Math.hypot(camera.lead.x, camera.lead.y)).toBeLessThan(1);
  });
});

describe('camera behaviour', () => {
  it('levels the local horizon, zooms out and tends toward an inertial space frame', () => {
    const ship = createShip();
    ship.position = { x: WORLD.radius + WORLD.shipRadius, y: 0 };
    const camera = new FlightCamera();
    camera.reset(ship);
    expect(camera.angle).toBeCloseTo(Math.PI / 2);
    ship.position.x = WORLD.radius + ATMOSPHERE.height * 2;
    settle(camera, ship, 10);
    expect(camera.angle).toBeCloseTo(0);
    expect(camera.zoom).toBeLessThan(0.45);
    expect(camera.x).toBeCloseTo(ship.position.x);
  });

  it('holds manual zoom through altitude changes until auto zoom is restored', () => {
    const ship = createShip();
    const camera = new FlightCamera();
    camera.reset(ship);
    camera.zoomBy(0.5);
    ship.position.y -= 3000;
    settle(camera, ship, 10);
    expect(camera.mode).toBe('manual');
    expect(camera.zoom).toBeCloseTo(groundZoom(900, false) * 0.5);
    camera.autoZoom();
    settle(camera, ship, 10);
    expect(camera.mode).toBe('auto');
    expect(camera.zoom).toBeLessThan(0.4);
    camera.zoomBy(1e9);
    settle(camera, ship, 10);
    expect(camera.zoom).toBeCloseTo(12);
    camera.zoomBy(1e-12);
    settle(camera, ship, 10);
    expect(camera.zoom).toBeCloseTo(0.035);
  });

  it('keeps the horizon local inside the atmosphere and crosses the angle seam smoothly', () => {
    const ship = createShip();
    const camera = new FlightCamera();
    ship.position = { x: WORLD.radius + 500, y: 0 };
    camera.reset(ship);
    settle(camera, ship, 5);
    expect(camera.angle).toBeCloseTo(Math.PI / 2);
    ship.position = { x: 10, y: WORLD.radius + 7 };
    camera.reset(ship);
    ship.position.x = -10;
    for (let i = 0; i < 60; i++) {
      const previous = camera.angle;
      camera.update(ship, 1 / 60);
      expect(Math.abs(wrap(camera.angle - previous))).toBeLessThan(0.01);
    }
  });

  it('smoothly changes focus and zoom when the pilot leaves the ship', () => {
    const ship = createShip();
    const camera = new FlightCamera();
    camera.reset(ship);
    const before = camera.zoom;
    const suit = { position: { x: 14, y: -WORLD.radius - 2.5 } };
    camera.update(suit, 1 / 60, true);
    expect(camera.x).toBeGreaterThan(0);
    expect(camera.x).toBeLessThan(14);
    expect(Math.abs(camera.zoom - before)).toBeLessThan(0.2);
    settle(camera, suit, 10, true);
    expect(camera.x).toBeCloseTo(14);
    expect(camera.zoom).toBeCloseTo(groundZoom(900, true));
  });

  it('respects fixed and reduced-motion horizon preferences without moving the physical actor', () => {
    const ship = createShip();
    ship.position = { x: WORLD.radius + 7, y: 0 };
    const before = structuredClone(ship);
    const camera = new FlightCamera();
    camera.reset(ship);
    camera.reducedMotion = true;
    camera.update(ship, 1 / 60);
    expect(camera.angle).toBe(0);
    expect(ship).toEqual(before);
    camera.reducedMotion = false;
    camera.rotate = false;
    camera.update(ship, 1 / 60);
    expect(camera.angle).toBe(0);
  });
});

describe('framing the work', () => {
  it('fits points of interest within the screen, leaving room above and below', () => {
    const centre = { x: 0, y: 0 };
    // A rock 200 m straight above (screen up, since the camera angle is 0, world up is -y).
    const above = framingZoom([{ x: 0, y: -200 }], centre, 0, 1600, 900);
    expect(above * 200).toBeLessThanOrEqual(0.3 * 900 + 1e-6);
    // The same distance sideways has more room, because the screen is wider than it is tall above the focus.
    const sideways = framingZoom([{ x: 200, y: 0 }], centre, 0, 1600, 900);
    expect(sideways).toBeGreaterThan(above);
    expect(sideways * 200).toBeLessThanOrEqual(0.36 * 1600 + 1e-6);
    // The tightest point decides.
    expect(framingZoom([{ x: 0, y: -50 }, { x: 0, y: -400 }], centre, 0, 1600, 900)).toBeCloseTo((0.3 * 900) / 400);
    expect(framingZoom([], centre, 0, 1600, 900)).toBe(Infinity);
  });

  it('turns with the camera', () => {
    const centre = { x: 0, y: 0 };
    const point = [{ x: 300, y: 0 }];
    const flat = framingZoom(point, centre, 0, 1600, 900);
    const turned = framingZoom(point, centre, Math.PI / 2, 1600, 900);
    expect(turned).toBeLessThan(flat);
  });

  it('zooms in on a rock under the laser, within what fits and the lander size, then eases back', () => {
    const camera = new FlightCamera();
    camera.viewportHeight = 900;
    camera.viewportWidth = 1600;
    const ship = lander(600, 0);
    camera.reset(ship);
    settle(camera, ship, 8);
    const alone = camera.zoom;

    camera.work = [{ x: ship.position.x + 40, y: ship.position.y - 90 }];
    settle(camera, ship, 8);
    expect(camera.zoom).toBeGreaterThan(alone * 1.3);
    expect(camera.zoom).toBeLessThanOrEqual(groundZoom(900, false) + 1e-6);

    camera.work = [];
    settle(camera, ship, 10);
    expect(camera.zoom).toBeCloseTo(alone, 1);
  });

  it('never lets the work leave the screen, however far it is', () => {
    const camera = new FlightCamera();
    camera.viewportHeight = 900;
    const ship = lander(600, 0);
    camera.reset(ship);
    camera.work = [{ x: ship.position.x, y: ship.position.y - 440 }];
    settle(camera, ship, 10);
    const fit = framingZoom(camera.work, { x: camera.x, y: camera.y }, camera.angle, 1600, 900);
    expect(camera.zoom).toBeLessThanOrEqual(Math.max(fit, groundZoom(900, false) / (1 + 600 / 240)) + 1e-6);
  });

  it('is ignored on foot', () => {
    const camera = new FlightCamera();
    const suit = { position: { x: 14, y: -WORLD.radius - 2.5 } };
    camera.reset(suit);
    camera.work = [{ x: 14, y: -WORLD.radius - 200 }];
    settle(camera, suit, 8, true);
    expect(camera.zoom).toBeCloseTo(groundZoom(900, true));
  });
});
