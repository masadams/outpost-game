import { expect, it } from 'vitest';
import { FlightCamera } from '../src/render/camera';
import { createShip } from '../src/sim/physics';
it('levels the local horizon, zooms out and tends toward an inertial space frame', () => {
  const ship = createShip(); ship.position = { x: 607, y: 0 };
  const camera = new FlightCamera(); camera.reset(ship);
  expect(camera.angle).toBeCloseTo(Math.PI / 2);
  ship.position.x = 2000;
  for (let i = 0; i < 600; i++) camera.update(ship, 1 / 60);
  expect(camera.angle).toBeCloseTo(0); expect(camera.zoom).toBeLessThan(0.4);
  expect(camera.x).toBeCloseTo(2000);
});
it('smoothly changes focus and zoom when the pilot leaves the ship', () => {
  const ship = createShip(), camera = new FlightCamera(); camera.reset(ship);
  const suit = { position: { x: 14, y: -602.5 } };
  camera.update(suit, 1 / 60, true);
  expect(camera.x).toBeGreaterThan(0); expect(camera.x).toBeLessThan(14); expect(camera.zoom).toBeGreaterThan(1.7);
  for (let i = 0; i < 300; i++) camera.update(suit, 1 / 60, true);
  expect(camera.x).toBeCloseTo(14); expect(camera.zoom).toBeGreaterThan(2.7);
});
