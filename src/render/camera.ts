import { clamp, localAngle, wrap } from '../sim/math';
import { WORLD } from '../sim/config';
import { SUIT } from '../sim/astronaut';
import type { Vec } from '../sim/math';
interface FollowTarget { position: Vec }
export class FlightCamera {
  x = 0; y = 0; angle = 0; zoom = 1.7;
  reset(ship: FollowTarget): void { this.x = ship.position.x; this.y = ship.position.y; this.angle = localAngle(ship.position); this.zoom = 1.7; }
  update(ship: FollowTarget, dt: number, onFoot = false): void {
    const altitude = Math.max(0, Math.hypot(ship.position.x, ship.position.y) - WORLD.radius - (onFoot ? SUIT.radius : WORLD.shipRadius));
    const blend = clamp((altitude - 100) / 800, 0, 1);
    const smooth = blend * blend * (3 - 2 * blend);
    // Smoothly blend the local frame into the fixed world frame, including at the angle seam.
    const targetAngle = this.angle + wrap(localAngle(ship.position) - this.angle) * (1 - smooth) + wrap(-this.angle) * smooth;
    const follow = 1 - Math.exp(-5 * dt);
    this.x += (ship.position.x - this.x) * follow;
    this.y += (ship.position.y - this.y) * follow;
    this.angle = wrap(this.angle + wrap(targetAngle - this.angle) * (1 - Math.exp(-2.5 * dt)));
    const baseZoom = onFoot ? 2.8 : 1.7;
    const targetZoom = clamp(baseZoom / (1 + altitude / 240), 0.18, baseZoom);
    this.zoom += (targetZoom - this.zoom) * (1 - Math.exp(-2 * dt));
  }
}
