import { nearestPlanet, relative } from '../../src/sim/celestial';
import { gravity } from '../../src/sim/environment';
import { wrap } from '../../src/sim/math';
import { engineStats } from '../../src/sim/shipStats';
import { shipMass } from '../../src/sim/shipMass';
import type { SystemFrame } from '../../src/sim/celestial';
import type { Ship } from '../../src/sim/physics';
/** Test pilot uses only ordinary rotation/thrust, with pulse-density throttle; never edits live state. */
export class TestPilot {
  private duty = 0;
  input(ship: Ship, target: { position: { x: number; y: number }; velocity: { x: number; y: number } }, system: SystemFrame, dt: number) {
    const dx = target.position.x - ship.position.x, dy = target.position.y - ship.position.y, distance = Math.hypot(dx, dy);
    const speed = Math.min(180, Math.sqrt(4 * distance));
    const gx = gravity(ship.position, system), acc = engineStats(ship).thrust / shipMass(ship);
    let ax = (target.velocity.x + dx / Math.max(1, distance) * speed - ship.velocity.x) / 2 - gx.x;
    let ay = (target.velocity.y + dy / Math.max(1, distance) * speed - ship.velocity.y) / 2 - gx.y;
    const planet = nearestPlanet(target.position, system), targetLocal = relative(target.position, planet);
    const landing = Math.hypot(targetLocal.x, targetLocal.y) < planet.radius + 10;
    if (landing) {
      ax = (target.velocity.x + Math.max(-2, Math.min(2, dx * .3)) - ship.velocity.x) * .5 - gx.x;
      ay = target.velocity.y + (dy > 0 ? Math.min(20, Math.sqrt(dy * 1.5)) : Math.max(-3, dy * .25)) - ship.velocity.y - gx.y;
    }
    const desired = landing ? ay >= 0 ? 0 : Math.max(-.15, Math.min(.15, Math.atan2(ax, -ay))) : Math.atan2(ax, -ay), error = wrap(desired - ship.angle);
    const drive = error * 3 - ship.angularVelocity * 1.5;
    const turn = Math.abs(drive) > .025 ? Math.sign(drive) : 0;
    this.duty = Math.min(1.99, this.duty + Math.min(1, (landing ? Math.max(0, -ay) / Math.cos(desired) : Math.hypot(ax, ay)) / acc));
    const thrust = Math.abs(error) < .15 && this.duty >= 1;
    if (thrust) this.duty -= 1;
    const current = relative(ship.position, planet), v = { x: ship.velocity.x - planet.velocity.x, y: ship.velocity.y - planet.velocity.y };
    const touchdown = landing && Math.hypot(current.x, current.y) - planet.radius - 7 < 1.5 && Math.hypot(v.x, v.y) < 4;
    return { thrust: touchdown ? false : thrust, turn };
  }
}
