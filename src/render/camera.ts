import { STATIC_SYSTEM, nearestPlanet, relative } from '../sim/celestial';
import { clamp, localAngle, wrap } from '../sim/math';
import { ATMOSPHERE, WORLD } from '../sim/config';
import { SUIT } from '../sim/astronaut';
import type { Vec } from '../sim/math';
interface FollowTarget { position: Vec }
export class FlightCamera {
  x = 0; y = 0; angle = 0; zoom = 1.7;
  private manualZoom: number | null = null;
  get mode(): 'auto' | 'manual' { return this.manualZoom === null ? 'auto' : 'manual'; }
  zoomBy(factor: number): void { if (Number.isFinite(factor) && factor > 0) this.manualZoom = clamp((this.manualZoom ?? this.zoom) * factor, 0.035, 5); }
  autoZoom(): void { this.manualZoom = null; }
  reset(ship: FollowTarget, system = STATIC_SYSTEM): void { this.x = ship.position.x; this.y = ship.position.y; this.angle = localAngle(relative(ship.position, nearestPlanet(ship.position, system))); this.zoom = 1.7; this.manualZoom = null; }
  update(ship: FollowTarget, dt: number, onFoot = false, system = STATIC_SYSTEM): void {
    const planet = nearestPlanet(ship.position, system), position = relative(ship.position, planet);
    const altitude = Math.max(0, Math.hypot(position.x, position.y) - planet.radius - (onFoot ? SUIT.radius : WORLD.shipRadius));
    const blend = clamp((altitude - ATMOSPHERE.height * 0.75) / (ATMOSPHERE.height * 0.75), 0, 1);
    const smooth = blend * blend * (3 - 2 * blend);
    // Smoothly blend the local frame into the fixed world frame, including at the angle seam.
    const targetAngle = this.angle + wrap(localAngle(relative(ship.position, nearestPlanet(ship.position, system))) - this.angle) * (1 - smooth) + wrap(-this.angle) * smooth;
    const follow = 1 - Math.exp(-5 * dt);
    this.x += (ship.position.x - this.x) * follow;
    this.y += (ship.position.y - this.y) * follow;
    this.angle = wrap(this.angle + wrap(targetAngle - this.angle) * (1 - Math.exp(-2.5 * dt)));
    const baseZoom = onFoot ? 2.8 : 1.7;
    const targetZoom = this.manualZoom ?? clamp(baseZoom / (1 + altitude / 360), 0.08, baseZoom);
    this.zoom += (targetZoom - this.zoom) * (1 - Math.exp(-2 * dt));
  }
}
