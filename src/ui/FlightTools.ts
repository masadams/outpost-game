import { isolateControlKeys } from './controlKeys';
import { ATMOSPHERE } from '../sim/config';
import { airDensity, gravity } from '../sim/environment';
import { flightRegion, REGION_LABELS } from '../sim/flightRegion';
import type { Ship } from '../sim/physics';
import type { Trajectory } from '../sim/trajectory';
import type { FlightCamera } from '../render/camera';

export type ViewAction = 'trajectory' | 'zoomIn' | 'zoomOut' | 'autoZoom';
export class FlightTools {
  private root = document.createElement('div');
  private status = document.createElement('div');
  private trajectoryButton: HTMLButtonElement;
  private value: HTMLElement;
  trajectory = true;
  constructor(onAction: (action: ViewAction) => void) {
    this.root.id = 'flight-tools'; this.status.id = 'flight-status';
    this.root.innerHTML = '<button type="button" data-view="trajectory" aria-pressed="true">Coast path [J]</button><button type="button" data-view="zoomOut" aria-label="Zoom out">−</button><button type="button" data-view="zoomIn" aria-label="Zoom in">+</button><button type="button" data-view="autoZoom">Auto [0]</button><span></span>';
    this.trajectoryButton = this.root.querySelector('button')!; this.value = this.root.querySelector('span')!;
    this.root.addEventListener('click', event => { const action = (event.target as HTMLElement).closest('button')?.dataset.view; if (action) onAction(action as ViewAction); });
    isolateControlKeys(this.root);
    document.body.append(this.root, this.status);
  }
  update(ship: Ship, camera: FlightCamera, prediction: Trajectory | null, towing = false): void {
    this.trajectoryButton.setAttribute('aria-pressed', String(this.trajectory));
    this.trajectoryButton.textContent = `Coast path [J] ${this.trajectory ? 'on' : 'off'}`;
    this.value.textContent = `${camera.mode} ${camera.zoom.toFixed(2)}×`;
    const density = airDensity(ship.position), g = gravity(ship.position);
    const path = towing ? 'tow active · prediction suspended' : !this.trajectory ? 'path hidden' : ship.state !== 'flying' ? 'launch to predict' : !prediction?.points.length ? 'updating…' : prediction.contact ? `contact in ${prediction.contact.seconds.toFixed(1)} s` : 'no terrain contact in 180 s';
    this.status.textContent = `${REGION_LABELS[flightRegion(ship.position)]} · ${density > 0 ? `AIR ${(density / ATMOSPHERE.surfaceDensity * 100).toFixed(1)}%` : 'NO AIR DRAG'} · g ${Math.hypot(g.x, g.y).toFixed(2)} m/s² · Coast: ${path}`;
    this.status.title = 'Coast prediction releases all controls and includes gravity and atmospheric drag. Moving objects and tools are not predicted; prediction is suspended while towing.';
    this.root.dataset.trajectory = String(this.trajectory); this.root.dataset.zoomMode = camera.mode; this.root.dataset.zoom = camera.zoom.toFixed(3);
    this.status.dataset.regime = density > 0 ? 'atmosphere' : 'vacuum';
    this.root.dataset.predictionPoints = String(towing ? 0 : prediction?.points.length ?? 0);
  }
  destroy(): void { this.root.remove(); this.status.remove(); }
}
