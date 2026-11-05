import { setText } from './dom';
import { STATIC_SYSTEM } from '../sim/celestial';
import { ATMOSPHERE } from '../sim/config';
import { airDensity, gravity } from '../sim/environment';
import { flightRegion, REGION_LABELS } from '../sim/flightRegion';
import type { Ship } from '../sim/physics';
import type { Trajectory } from '../sim/trajectory';

/** Coast-path and environment status line. It lives in the telemetry details drawer. */
export class FlightTools {
  private status = document.createElement('div');
  trajectory = true;

  constructor() {
    this.status.id = 'flight-status';
    document.body.append(this.status);
  }

  update(ship: Ship, prediction: Trajectory | null, towing = false, system = STATIC_SYSTEM): void {
    const density = airDensity(ship.position, system);
    const g = gravity(ship.position, system);
    const air = density > 0 ? `AIR ${(density / ATMOSPHERE.surfaceDensity * 100).toFixed(1)}%` : 'NO AIR DRAG';
    setText(this.status, `${REGION_LABELS[flightRegion(ship.position, system)]} · ${air} · g ${Math.hypot(g.x, g.y).toFixed(2)} m/s² · Coast: ${this.pathStatus(ship, prediction, towing)}`);
    this.status.title = 'The coast path assumes no further input and includes gravity and air drag. It pauses while towing.';
    this.status.dataset.regime = density > 0 ? 'atmosphere' : 'vacuum';
  }

  private pathStatus(ship: Ship, prediction: Trajectory | null, towing: boolean): string {
    if (towing) return 'paused while towing';
    if (!this.trajectory) return 'path hidden';
    if (ship.state !== 'flying') return 'launch to predict';
    if (!prediction?.points.length) return 'updating…';
    if (prediction.contact) return `contact in ${prediction.contact.seconds.toFixed(1)} s`;
    return 'no ground contact in 180 s';
  }

  destroy(): void {
    this.status.remove();
  }
}
