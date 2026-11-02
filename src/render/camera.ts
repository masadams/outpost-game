import { clamp, localAngle, wrap } from '../sim/math';
import { telemetry, type Ship } from '../sim/physics';
export class FlightCamera {
  x = 0; y = 0; angle = 0; zoom = 1.7;
  reset(ship: Ship): void { this.x = ship.position.x; this.y = ship.position.y; this.angle = localAngle(ship.position); this.zoom = 1.7; }
  update(ship: Ship, dt: number): void {
    const altitude = telemetry(ship).altitude;
    const blend = clamp((altitude - 100) / 800, 0, 1);
    const smooth = blend * blend * (3 - 2 * blend);
    // Smoothly blend the local frame into the fixed world frame, including at the angle seam.
    const targetAngle = this.angle + wrap(localAngle(ship.position) - this.angle) * (1 - smooth) + wrap(-this.angle) * smooth;
    const follow = 1 - Math.exp(-5 * dt);
    this.x += (ship.position.x - this.x) * follow;
    this.y += (ship.position.y - this.y) * follow;
    this.angle = wrap(this.angle + wrap(targetAngle - this.angle) * (1 - Math.exp(-2.5 * dt)));
    const targetZoom = clamp(1.7 / (1 + altitude / 240), 0.18, 1.7);
    this.zoom += (targetZoom - this.zoom) * (1 - Math.exp(-2 * dt));
  }
}
