import { h, render } from 'preact';
import { featureVisible } from '../preferences/features';
import type { WorldState } from '../sim/world';
import { instrumentReadings, detailMarkup } from './instruments';
import { patchMarkup, setText } from './dom';
import { isolateControlKeys } from './controlKeys';
import { flightView } from './flight/flightView';
import { InstrumentCluster } from './flight/InstrumentCluster';

/** Flight cluster plus an on-demand diagnostics drawer. Browsing never pauses or sends simulation input. */
export class InstrumentPanel {
  private expanded = false;
  private mount: HTMLElement;
  private drawer: HTMLElement;
  private readings: HTMLElement;
  private environment: HTMLElement;
  private combat: HTMLElement;
  private flightStatus: HTMLElement | null = null;
  private latest: WorldState | null = null;

  constructor(private root: HTMLElement, private cancelAutopilot: () => void) {
    root.dataset.expanded = 'false';
    root.id = 'instrument-console';
    root.innerHTML = `<div class="cluster-mount"></div>
      <section id="telemetry-details" class="telemetry-details" aria-label="Detailed flight telemetry" hidden>
        <h2>Flight diagnostics</h2>
        <div class="detailed-readings"></div>
        <div class="instrument-combat"></div>
        <div class="instrument-environment"><h3>Coast path and environment</h3></div>
        <small>Speeds are measured against the ground below you. Positive vertical speed climbs.</small>
      </section>`;
    this.mount = root.querySelector('.cluster-mount')!;
    this.drawer = root.querySelector('.telemetry-details')!;
    this.readings = root.querySelector('.detailed-readings')!;
    this.environment = root.querySelector('.instrument-environment')!;
    this.combat = root.querySelector('.instrument-combat')!;
    isolateControlKeys(root);
  }

  private toggle = (byPointer: boolean): void => {
    this.expanded = !this.expanded;
    this.root.dataset.expanded = String(this.expanded);
    this.drawer.hidden = !this.expanded;
    if (this.latest) this.update(this.latest);
    if (byPointer) this.root.querySelector<HTMLButtonElement>('[data-telemetry-toggle]')?.blur();
  };

  update(w: WorldState): void {
    this.latest = w;
    const foot = w.playerMode === 'astronaut';
    this.root.dataset.mode = foot ? 'crew' : 'ship';
    const program = w.autopilot.program;
    render(
      h(InstrumentCluster, {
        view: flightView(w),
        detailsOpen: this.expanded,
        autopilot: program ? `AP ${program.target} / ${program.phase} ×` : null,
        onToggleDetails: this.toggle,
        onCancelAutopilot: this.cancelAutopilot,
      }),
      this.mount,
    );
    patchMarkup(this.readings, detailMarkup(instrumentReadings(w)));
    const a = w.ship.armament;
    const weapons = `${a.selected.toUpperCase()} ${a[a.selected]} · cell ${a.energy.toFixed(0)} · heat ${a.heat.toFixed(0)}`;
    setText(this.combat, foot || !featureVisible('combat') ? '' : `${weapons}${a.overheated ? ' · COOLING LOCK' : ''}`);
    // FlightTools owns #flight-status; it moves into the drawer and keeps updating there.
    this.flightStatus ??= document.getElementById('flight-status');
    if (this.flightStatus && this.flightStatus.parentElement !== this.environment) this.environment.append(this.flightStatus);
  }
}
