import { expect, it } from 'vitest';
import { predictCoast } from '../src/sim/trajectory';
import { createShip, IDLE, stepShip } from '../src/sim/physics';
import { STEP, WORLD } from '../src/sim/config';

it('predicts the exact live engine-off gravity/drag path without modifying the real ship', () => {
  const ship = createShip(); ship.state = 'flying'; ship.position.y -= 500; ship.velocity = { x: 30, y: -20 }; ship.thrusting = true;
  const before = structuredClone(ship), prediction = predictCoast(ship, 5);
  expect(ship).toEqual(before);
  const live = structuredClone(ship); for (let i = 0; i < 300; i++) stepShip(live, IDLE, STEP);
  expect(prediction.points.at(-1)).toEqual(live.position); expect(prediction.seconds).toBe(5); expect(prediction.contact).toBeNull();
});
it('stops at the same first touchdown as live physics and classifies a safe coast', () => {
  const ship = createShip(); ship.state = 'flying'; ship.position.y -= 0.2; ship.velocity.y = 2;
  const prediction = predictCoast(ship); const live = structuredClone(ship); let steps = 0;
  while (live.state === 'flying' && steps < 60) { stepShip(live, IDLE, STEP); steps++; }
  expect(prediction.contact?.safe).toBe(true); expect(prediction.contact?.seconds).toBeCloseTo(steps * STEP);
  expect(prediction.contact?.position).toEqual(live.position); expect(live.position.y).toBeCloseTo(-WORLD.radius - WORLD.shipRadius);
});
it('marks unsafe first contact, avoids plotting landed/crashed ships and caps the horizon', () => {
  const ship = createShip(); expect(predictCoast(ship).points).toEqual([]);
  ship.state = 'flying'; ship.position.y -= 0.1; ship.velocity.y = 40;
  expect(predictCoast(ship).contact?.safe).toBe(false);
  ship.state = 'crashed'; expect(predictCoast(ship).points).toEqual([]);
  ship.state = 'flying'; ship.position.y -= 100000; ship.velocity.y = -100;
  expect(predictCoast(ship, 100000).seconds).toBe(240);
});
