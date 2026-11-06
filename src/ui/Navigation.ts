import { h, render } from 'preact';
import type { ColonyAction } from '../sim/colony';
import { navigation } from '../sim/exploration';
import type { WorldState } from '../sim/world';
import { MapWindowView, type MapHandlers } from './map/MapWindow';
import { mapView } from './map/mapView';

const fmt = (n: number) => n.toFixed(1);

/** The Map window, plus the one-line target guidance shown in the HUD while flying. */
export class NavigationPanel {
  readonly root = document.createElement('section');
  readonly guidance = document.createElement('div');
  private paused = false;
  private zoom = 1;
  private focus = false;
  private latest: WorldState | null = null;
  private handlers: MapHandlers;

  constructor(issue: (action: ColonyAction) => void) {
    this.root.id = 'navigation-panel';
    this.root.setAttribute('aria-label', 'Map');
    this.guidance.id = 'navigation-guidance';
    this.handlers = {
      select: target => issue({ type: 'navigate', target }),
      mark: point => issue({ type: 'mark', point }),
      visit: () => { if (!this.paused) issue({ type: 'visitSite' }); },
      zoom: action => {
        if (action === 'in') this.zoom = Math.min(8, this.zoom * 1.5);
        if (action === 'out') this.zoom = Math.max(0.5, this.zoom / 1.5);
        if (action === 'fit') { this.zoom = 1; this.focus = false; }
        if (action === 'focus') { this.zoom = 2; this.focus = true; }
        if (this.latest) this.render(this.latest);
      },
    };
  }

  update(w: WorldState, paused: boolean, visible: boolean): void {
    this.paused = paused;
    this.latest = w;
    const n = navigation(w);
    const code = w.exploration.selected === 'home' ? 'HOME' : n.label.toUpperCase();
    this.guidance.textContent = `${n.occluded ? '△ BLOCKED · ' : ''}${code} · ${Math.round(n.range)} m · closing ${fmt(n.closing)} m/s · relative ${fmt(n.relativeSpeed)} m/s`;
    this.guidance.title = `${n.label}. Positive closing speed means you are getting closer. To meet it, cancel your relative speed.`;
    this.guidance.dataset.target = w.exploration.selected;
    // Guidance helps while flying; on the pad or on foot it is noise.
    this.guidance.hidden = w.playerMode !== 'ship' || w.ship.state !== 'flying';
    if (visible) this.render(w);
  }

  private render(w: WorldState): void {
    render(h(MapWindowView, { state: { view: mapView(w), paused: this.paused, zoom: this.zoom, focus: this.focus }, on: this.handlers }), this.root);
  }
}
