import { h, render } from 'preact';
import type { JSX } from 'preact';
import type { BaseView, BuildingView, Chip } from './baseView';

export type BaseSection = 'overview' | 'buildings' | 'ship' | 'legacy';

export interface BaseHandlers {
  section: (section: BaseSection) => void;
  select: (id: number) => void;
  toggle: (id: number) => void;
  recipe: (id: number) => void;
}

export interface BaseState {
  view: BaseView;
  section: BaseSection;
  selected: number | null;
  paused: boolean;
  /** True with ?features=all: the old console for hidden systems is reachable. */
  legacy: boolean;
}

function click(action: () => void) {
  return (event: JSX.TargetedMouseEvent<HTMLButtonElement>) => {
    action();
    if (event.detail > 0) event.currentTarget.blur();
  };
}

const CHIP_TONE: Record<Chip, string> = {
  running: 'good',
  idle: 'neutral',
  stopped: 'warn',
  off: 'neutral',
  wrecked: 'bad',
};

function Meter({ fraction, tone }: { fraction: number; tone: string }) {
  return (
    <span class="base-meter" data-tone={tone} aria-hidden="true">
      <i style={{ width: `${(Math.max(0, Math.min(1, fraction)) * 100).toFixed(1)}%` }} />
    </span>
  );
}

function Overview({ view, open }: { view: BaseView; open: (id: number) => void }) {
  const p = view.power;
  const products = view.stocks.filter(s => s.group === 'product');
  const ore = view.stocks.filter(s => s.group === 'ore');
  return (
    <div class="base-main" data-base-section="overview">
      <h3>Materials</h3>
      <div class="base-stocks">
        {products.map(s => (
          <div class="base-stock" key={s.key} data-stock={s.key}>
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>
      <div class="base-stocks base-ore">
        {ore.map(s => (
          <div class="base-stock" key={s.key} data-stock={s.key}>
            <span>{s.label} ore</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>
      <p class="base-note">
        Storage holds {view.storage.ore} of ore and {view.storage.products} of each material.
      </p>
      <h3>Power</h3>
      <div class="base-power" data-level={p.level}>
        <div class="base-power-row">
          <span>Generating</span>
          <Meter fraction={p.generating / Math.max(p.generating, p.using, 1)} tone="good" />
          <strong>{p.generating.toFixed(1)} kW</strong>
        </div>
        <div class="base-power-row">
          <span>Using</span>
          <Meter fraction={p.using / Math.max(p.generating, p.using, 1)} tone={p.level === 'good' ? 'mint' : 'warn'} />
          <strong>{p.using.toFixed(1)} kW</strong>
        </div>
        <div class="base-power-row">
          <span>Stored</span>
          <Meter fraction={p.stored / Math.max(p.capacity, 1)} tone="mint" />
          <strong>
            {p.stored.toFixed(0)} / {p.capacity.toFixed(0)} kJ
          </strong>
        </div>
        <p class="base-power-summary">{p.summary}</p>
      </div>
      <h3>Needs attention</h3>
      {view.attention.length ? (
        <ul class="base-attention">
          {view.attention.map(a => (
            <li key={a.id}>
              <button type="button" onClick={click(() => open(a.id))}>
                {a.text}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p class="base-note">{view.buildings.length ? 'Everything is running.' : 'No buildings yet. Press Build to place your first.'}</p>
      )}
    </div>
  );
}

function BuildingRow({ b, selected, select }: { b: BuildingView; selected: boolean; select: (id: number) => void }) {
  return (
    <button
      type="button"
      class="base-row"
      data-building={b.id}
      aria-pressed={selected}
      aria-label={`Select ${b.label} ${b.id}`}
      onClick={click(() => select(b.id))}
    >
      <span class="base-row-name">
        {b.label}
        <small>{b.line}</small>
      </span>
      <span class="base-chip" data-tone={CHIP_TONE[b.chip]}>
        {b.chipLabel}
      </span>
    </button>
  );
}

function Inspector({ b, paused, on }: { b: BuildingView | null; paused: boolean; on: BaseHandlers }) {
  if (!b) return <aside class="base-inspector"><p class="base-note">Select a building to see what it is doing.</p></aside>;
  return (
    <aside class="base-inspector" data-inspect={b.id} aria-label={`${b.label} details`}>
      <h3>{b.label}</h3>
      <span class="base-chip" data-tone={CHIP_TONE[b.chip]}>
        {b.chipLabel}
      </span>
      {b.why && <p class="base-why">{b.why}</p>}
      <dl class="base-facts">
        {b.facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div class="base-actions">
        {b.canToggle && (
          <button type="button" disabled={paused} onClick={click(() => on.toggle(b.id))}>
            {b.enabled ? 'Turn off' : 'Turn on'}
          </button>
        )}
        {b.canCycleRecipe && (
          <button type="button" disabled={paused} onClick={click(() => on.recipe(b.id))}>
            Next recipe
          </button>
        )}
      </div>
      {paused && <p class="base-note">Resume the game to change buildings.</p>}
    </aside>
  );
}

function Buildings({ state, on }: { state: BaseState; on: BaseHandlers }) {
  const { buildings } = state.view;
  const selected = buildings.find(b => b.id === state.selected) ?? buildings[0] ?? null;
  return (
    <div class="base-split" data-base-section="buildings">
      <div class="base-main">
        <h3>Buildings · {buildings.length}</h3>
        {buildings.length ? (
          <div class="base-rows">
            {buildings.map(b => (
              <BuildingRow key={b.id} b={b} selected={selected?.id === b.id} select={on.select} />
            ))}
          </div>
        ) : (
          <p class="base-note">No buildings yet. Press Build to place your first.</p>
        )}
      </div>
      <Inspector b={selected} paused={state.paused} on={on} />
    </div>
  );
}

function Ship({ view }: { view: BaseView }) {
  const s = view.ship;
  return (
    <div class="base-main" data-base-section="ship">
      <h3>Your lander · {s.where}</h3>
      <div class="base-power">
        <div class="base-power-row">
          <span>Fuel</span>
          <Meter fraction={s.fuelFraction} tone="mint" />
          <strong>{s.fuel}</strong>
        </div>
        <div class="base-power-row">
          <span>Hull</span>
          <Meter fraction={s.hullFraction} tone="good" />
          <strong>{s.hull}</strong>
        </div>
        <div class="base-power-row">
          <span>Cargo</span>
          <Meter fraction={s.cargoFraction} tone="ore" />
          <strong>{s.cargo}</strong>
        </div>
      </div>
      <p class="base-why" data-tone="info">{s.hint}</p>
    </div>
  );
}

const SECTIONS: Array<[BaseSection, string]> = [
  ['overview', 'Overview'],
  ['buildings', 'Buildings'],
  ['ship', 'Lander'],
];

export function BaseWindowView({ state, on, legacyHost }: { state: BaseState; on: BaseHandlers; legacyHost: (el: HTMLElement | null) => void }) {
  const sections = state.legacy ? [...SECTIONS, ['legacy', 'Legacy console'] as [BaseSection, string]] : SECTIONS;
  return (
    <div class="base-window" data-section={state.section}>
      <nav class="base-nav" aria-label="Base sections">
        {sections.map(([id, label]) => (
          <button key={id} type="button" data-base-nav={id} aria-pressed={state.section === id} onClick={click(() => on.section(id))}>
            {label}
          </button>
        ))}
        {!state.legacy && <p class="base-more">More sections open as your outpost grows.</p>}
      </nav>
      <div class="base-body">
        {state.section === 'overview' && <Overview view={state.view} open={id => { on.select(id); on.section('buildings'); }} />}
        {state.section === 'buildings' && <Buildings state={state} on={on} />}
        {state.section === 'ship' && <Ship view={state.view} />}
        {/* The old console is mounted here by the HUD; Preact never touches its contents. */}
        <div class="base-legacy" hidden={state.section !== 'legacy'} ref={legacyHost} />
      </div>
    </div>
  );
}

/** Owns the Preact root for the Base window. */
export class BaseWindow {
  readonly host = document.createElement('div');
  legacySlot: HTMLElement | null = null;

  constructor(private handlers: BaseHandlers) {
    this.host.id = 'base-window';
  }

  update(state: BaseState): void {
    render(h(BaseWindowView, { state, on: this.handlers, legacyHost: el => { if (el) this.legacySlot = el; } }), this.host);
  }

  destroy(): void {
    render(null, this.host);
    this.host.remove();
  }
}
