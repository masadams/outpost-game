import { h, render } from 'preact';
import { useEffect } from 'preact/hooks';
import type { JSX } from 'preact';
import type { BuildingView } from './baseView';
import { Demolish } from './Demolish';

export interface ContextMenuHandlers {
  details: () => void;
  toggle: () => void;
  recipe: () => void;
  auto: () => void;
  demolish: () => void;
  close: () => void;
}

export interface ContextMenuState {
  building: BuildingView;
  /** Screen position of the click. */
  x: number;
  y: number;
  paused: boolean;
}

function item(action: () => void, close: () => void) {
  return (event: JSX.TargetedMouseEvent<HTMLButtonElement>) => {
    action();
    close();
    if (event.detail > 0) event.currentTarget.blur();
  };
}

/** The usual right-click menu on a building: what it is, then what you can do. */
export function ContextMenuView({ state, on }: { state: ContextMenuState; on: ContextMenuHandlers }) {
  const b = state.building;
  useEffect(() => {
    const down = (event: PointerEvent) => {
      if (!(event.target as Element | null)?.closest?.('.context-menu')) on.close();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        on.close();
      }
    };
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('keydown', key, true);
    };
  }, []);
  const left = Math.max(8, Math.min(state.x, window.innerWidth - 260));
  const top = Math.max(8, Math.min(state.y, window.innerHeight - 300));
  return (
    <div class="context-menu" role="menu" aria-label={`${b.label} menu`} style={{ left: `${left}px`, top: `${top}px` }}>
      <header>
        <strong>{b.label}</strong>
        <span class="base-chip" data-tone={b.chip === 'running' ? 'good' : b.chip === 'stopped' ? 'warn' : b.chip === 'wrecked' ? 'bad' : 'neutral'}>
          {b.chipLabel}
        </span>
      </header>
      <button type="button" role="menuitem" onClick={item(on.details, on.close)}>
        Details
      </button>
      {b.canToggle && (
        <button type="button" role="menuitem" disabled={state.paused} onClick={item(on.toggle, on.close)}>
          {b.enabled ? 'Turn off' : 'Turn on'}
        </button>
      )}
      {b.canCycleRecipe && (
        <button type="button" role="menuitem" disabled={state.paused} onClick={item(on.recipe, on.close)}>
          Next recipe
        </button>
      )}
      {b.turret && (
        <button type="button" role="menuitem" disabled={state.paused} onClick={item(on.auto, on.close)}>
          Auto defence: {b.turret.auto ? 'on' : 'off'}
        </button>
      )}
      <hr />
      <Demolish
        label={b.label}
        salvage={b.salvage}
        blocked={b.demolishBlocked}
        disabled={state.paused}
        onConfirm={() => {
          on.demolish();
          on.close();
        }}
      />
    </div>
  );
}

export class ContextMenu {
  readonly host = document.createElement('div');

  constructor(private handlers: ContextMenuHandlers) {
    this.host.id = 'context-menu-host';
  }

  update(state: ContextMenuState | null): void {
    render(state ? h(ContextMenuView, { state, on: this.handlers }) : null, this.host);
  }

  destroy(): void {
    render(null, this.host);
    this.host.remove();
  }
}
