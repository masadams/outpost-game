import { expect, it } from 'vitest';
import { FlightCamera } from '../src/render/camera';
import { createShip } from '../src/sim/physics';
import { ATMOSPHERE, WORLD } from '../src/sim/config';
import { wrap } from '../src/sim/math';
it('levels the local horizon, zooms out and tends toward an inertial space frame', () => {
  const ship = createShip(); ship.position = { x: WORLD.radius + WORLD.shipRadius, y: 0 };
  const camera = new FlightCamera(); camera.reset(ship);
  expect(camera.angle).toBeCloseTo(Math.PI / 2);
  ship.position.x = WORLD.radius + ATMOSPHERE.height * 2;
  for (let i = 0; i < 600; i++) camera.update(ship, 1 / 60);
  expect(camera.angle).toBeCloseTo(0); expect(camera.zoom).toBeLessThan(0.4);
  expect(camera.x).toBeCloseTo(ship.position.x);
});
it('holds manual zoom through altitude changes until auto zoom is restored', () => {
  const ship = createShip(), camera = new FlightCamera(); camera.reset(ship); camera.zoomBy(0.5);
  ship.position.y -= 3000;
  for (let i = 0; i < 600; i++) camera.update(ship, 1 / 60);
  expect(camera.mode).toBe('manual'); expect(camera.zoom).toBeCloseTo(0.85);
  camera.autoZoom(); for (let i = 0; i < 600; i++) camera.update(ship, 1 / 60);
  expect(camera.mode).toBe('auto'); expect(camera.zoom).toBeLessThan(0.3);
  camera.zoomBy(1e9); for (let i = 0; i < 600; i++) camera.update(ship, 1 / 60); expect(camera.zoom).toBeCloseTo(5);
  camera.zoomBy(1e-12); for (let i = 0; i < 600; i++) camera.update(ship, 1 / 60); expect(camera.zoom).toBeCloseTo(0.035);
});
it('keeps the horizon local inside the atmosphere and crosses the angle seam smoothly', () => {
  const ship = createShip(), camera = new FlightCamera(); ship.position = { x: WORLD.radius + 500, y: 0 }; camera.reset(ship);
  for (let i = 0; i < 300; i++) camera.update(ship, 1 / 60); expect(camera.angle).toBeCloseTo(Math.PI / 2);
  ship.position = { x: 10, y: WORLD.radius + 7 }; camera.reset(ship); ship.position.x = -10;
  for (let i = 0; i < 60; i++) { const previous = camera.angle; camera.update(ship, 1 / 60); expect(Math.abs(wrap(camera.angle - previous))).toBeLessThan(0.01); }
});
it('smoothly changes focus and zoom when the pilot leaves the ship', () => {
  const ship = createShip(), camera = new FlightCamera(); camera.reset(ship);
  const suit = { position: { x: 14, y: -WORLD.radius - 2.5 } };
  camera.update(suit, 1 / 60, true);
  expect(camera.x).toBeGreaterThan(0); expect(camera.x).toBeLessThan(14); expect(camera.zoom).toBeGreaterThan(1.7);
  for (let i = 0; i < 300; i++) camera.update(suit, 1 / 60, true);
  expect(camera.x).toBeCloseTo(14); expect(camera.zoom).toBeGreaterThan(2.7);
});

it('respects fixed/reduced-motion horizon preferences without moving the physical actor',()=>{
 const ship=createShip();ship.position={x:WORLD.radius+7,y:0};const before=structuredClone(ship),camera=new FlightCamera();camera.reset(ship);camera.reducedMotion=true;camera.update(ship,1/60);expect(camera.angle).toBe(0);expect(ship).toEqual(before);
 camera.reducedMotion=false;camera.rotate=false;camera.update(ship,1/60);expect(camera.angle).toBe(0);
});
