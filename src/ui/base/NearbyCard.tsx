import { h, render } from 'preact';
import type { JSX } from 'preact';
import type { BuildingView } from './baseView';

export interface NearbyHandlers {
  toggle: () => void;
  recipe: () => void;
  repair: () => void;
  details: (id: number) => void;
}

export interface NearbyState {
  building: BuildingView;
  damaged: boolean;
  paused: boolean;
}

function click(action: () => void) {
  return (event: JSX.TargetedMouseEvent<HTMLButtonElement>) => {
    action();
    if (event.detail > 0) event.currentTarget.blur();
  };
}

/** The building you are standing next to, with its quick controls and their keys. */
export function NearbyCardView({ state, on }: { state: NearbyState; on: NearbyHandlers }) {
  const b = state.building;
  return (
    <section class="nearby-card" aria-label={`Nearby: ${b.label}`} data-building={b.id} data-chip={b.chip}>
      <header>
        <span class="nearby-label">Nearby</span>
        <strong>{b.label}</strong>
        <span class="base-chip" data-tone={b.chip === 'running' ? 'good' : b.chip === 'stopped' ? 'warn' : b.chip === 'wrecked' ? 'bad' : 'neutral'}>
          {b.chipLabel}
        </span>
      </header>
      {b.why && <p class="nearby-why">{b.why}</p>}
      <div class="nearby-actions">
        {b.canToggle && (
          <button type="button" disabled={state.paused} onClick={click(on.toggle)}>
            {b.enabled ? 'Turn off' : 'Turn on'} <kbd aria-hidden="true">E</kbd>
          </button>
        )}
        {b.canCycleRecipe && (
          <button type="button" disabled={state.paused} onClick={click(on.recipe)}>
            Next recipe <kbd aria-hidden="true">V</kbd>
          </button>
        )}
        {state.damaged && (
          <button type="button" disabled={state.paused} onClick={click(on.repair)}>
            Repair <kbd aria-hidden="true">U</kbd>
          </button>
        )}
        <button type="button" onClick={click(() => on.details(b.id))}>
          Details
        </button>
      </div>
    </section>
  );
}

export class NearbyCard {
  readonly host = document.createElement('div');

  constructor(private handlers: NearbyHandlers) {
    this.host.id = 'nearby-card';
  }

  update(state: NearbyState | null): void {
    render(state ? h(NearbyCardView, { state, on: this.handlers }) : null, this.host);
  }
}
