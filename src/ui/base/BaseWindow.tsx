import { ResearchView } from './ResearchTree';
import { h, render } from 'preact';
import type { JSX } from 'preact';
import type { BaseView, BuildingView, Chip } from './baseView';
import { Demolish } from './Demolish';

export type BaseSection = 'overview' | 'buildings' | 'ship' | 'research' | 'legacy';

export interface BaseHandlers {
  section: (section: BaseSection) => void;
  select: (id: number) => void;
  toggle: (id: number) => void;
  recipe: (id: number) => void;
  upgrade: (id: number, level: 2 | 3) => void;
  auto: (id: number) => void;
  target: (id: number, product: string, delta: -5 | 5) => void;
  analyse: () => void;
  study: () => void;
  studyCore: () => void;
  research: (tech: string) => void;
  fit: (upgrade: string) => void;
  send: (to: string) => void;
  beacon: () => void;
  reserve: (direction: -1 | 1) => void;
  demolish: (id: number) => void;
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

function Overview({ view, open, analyse, study, studyCore, research, fit, send, beacon, reserve, paused }: { view: BaseView; open: (id: number) => void; analyse: () => void; study: () => void; studyCore: () => void; research: (tech: string) => void; fit: (upgrade: string) => void; send: (to: string) => void; beacon: () => void; reserve: (d: -1 | 1) => void; paused: boolean }) {
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
        {p.forecast && <p class="base-power-summary" data-forecast>{p.forecast}</p>}
        <div class="base-reserve" data-reserve={p.reserve}>
          <span>Keep for turrets</span>
          <button type="button" aria-label="Keep less power for turrets" disabled={paused || p.reserve <= 0} onClick={click(() => reserve(-1))}>−</button>
          <strong>{p.reserve} kJ</strong>
          <button type="button" aria-label="Keep more power for turrets" disabled={paused} onClick={click(() => reserve(1))}>+</button>
        </div>
        <p class="base-note">Other machines stop before they use this, so turrets still have power in a storm or at night.</p>
        {p.defence && <p class="base-power-summary" data-defence>{p.defence}</p>}
        {p.islands && <p class="base-power-summary" data-islands>{p.islands}</p>}
      </div>
      {view.pods && (
        <section class="base-storm" aria-label="Cargo pods">
          <h3>Cargo pods</h3>
          {view.pods.sends.map(s => (
            <div key={s.to}>
              <button type="button" class="base-analyse" data-pod={s.to} disabled={s.reason !== null} onClick={click(() => send(s.to))}>
                {s.label}
              </button>
              {s.reason && <p class="base-why">{s.reason}</p>}
            </div>
          ))}
          {view.pods.flying.map(line => <p key={line} class="base-note">On its way: {line}</p>)}
        </section>
      )}
      {view.signal && (
        <section class="base-storm" aria-label="Deep signal" data-signal={view.signal.state}>
          <h3>Deep signal</h3>
          <p>{view.signal.line}</p>
          {view.signal.echo && (
            <div class="base-echo" data-echo>
              <strong>{view.signal.echo.name}</strong>
              {view.signal.echo.lines.map(l => <p key={l} class="base-note">{l}</p>)}
            </div>
          )}
          {view.signal.state === 'ready' && (
            <button type="button" class="base-analyse" data-beacon disabled={view.signal.reason !== null || paused} onClick={click(beacon)}>
              Launch the beacon
            </button>
          )}
          {view.signal.reason && <p class="base-why">{view.signal.reason}</p>}
        </section>
      )}
      {view.elsewhere.length > 0 && (
        <section class="base-storm base-elsewhere" aria-label="Other worlds">
          <h3>Other worlds</h3>
          {view.elsewhere.map(o => (
            <div key={o.id} data-outpost={o.id} data-level={o.level}>
              <strong>{o.label}</strong>
              <p class="base-note">{o.power}. {o.stores}.</p>
              {o.machines.length > 0 && <p class="base-note">{o.machines.map(m => `${m.label}: ${m.line}`).join(' · ')}</p>}
              {o.short.map(line => <p key={line} class="base-why">{line}</p>)}
            </div>
          ))}
        </section>
      )}
      {view.research && (
        <section class="base-storm" aria-label="Research">
          <h3>Research</h3>
          {view.research.map(row => (
            <div key={row.id} data-find={row.id}>
              <strong>{row.find}</strong>
              <p class="base-note">{row.line}</p>
              {row.progress !== null && <span class="ship-meter" aria-hidden="true"><i style={{ width: `${(row.progress * 100).toFixed(0)}%` }} /></span>}
              {row.action && (
                <>
                  <button
                    type="button"
                    class="base-analyse"
                    data-research={row.action.kind}
                    disabled={row.action.reason !== null}
                    onClick={click(() => (row.action!.kind === 'research' ? research(row.action!.tech) : fit(row.action!.upgrade ?? '')))}
                  >
                    {row.action.label}
                  </button>
                  {row.action.reason && <p class="base-why">{row.action.reason}</p>}
                </>
              )}
            </div>
          ))}
        </section>
      )}
      {view.core && (
        <section class="base-storm" aria-label="Cinder core sample" data-studied={String(view.core.studied)}>
          <h3>Cinder core sample</h3>
          <p class="base-note">{view.core.line}</p>
          <button type="button" class="base-analyse" data-study-core="true" disabled={view.core.blocked !== null} onClick={click(studyCore)}>
            Study the core sample
          </button>
          {view.core.blocked && <p class="base-why">{view.core.blocked}</p>}
        </section>
      )}
      {view.crystal && (
        <section class="base-storm" aria-label="Nacre crystal" data-studied={String(view.crystal.studied)}>
          <h3>Nacre crystal</h3>
          <p class="base-note">{view.crystal.line}</p>
          <button type="button" class="base-analyse" data-study="true" disabled={view.crystal.blocked !== null} onClick={click(study)}>
            Study the crystal
          </button>
          {view.crystal.blocked && <p class="base-why">{view.crystal.blocked}</p>}
        </section>
      )}
      {view.storm && (
        <section class="base-storm" aria-label="Storm pieces" data-analysed={String(view.storm.analysed)}>
          <h3>Storm pieces</h3>
          <p class="base-note">
            {view.storm.line} On the ground: {view.storm.onGround} · Carrying: {view.storm.held}
          </p>
          <button
            type="button"
            class="base-analyse"
            disabled={view.storm.blocked !== null}
            onClick={click(analyse)}
          >
            Analyse a piece
          </button>
          {view.storm.blocked && <p class="base-why">{view.storm.blocked}</p>}
        </section>
      )}
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
        {b.canCycleRecipe && b.autoRecipe !== null && (
          <button type="button" disabled={paused} data-auto={String(b.autoRecipe)} onClick={click(() => on.auto(b.id))}>
            Auto recipe: {b.autoRecipe ? 'on' : 'off'}
          </button>
        )}
        {b.targets && (
          <div class="base-targets" aria-label="Stock targets">
            <p class="base-note">Keeps these in stock, in kg. It makes whichever is short.</p>
            {b.targets.map(t => (
              <div class="base-target" key={t.product} data-target={t.product}>
                <span>{t.product}</span>
                <button type="button" disabled={paused || t.value <= 0} aria-label={`Lower ${t.product} target`} onClick={click(() => on.target(b.id, t.product, -5))}>−</button>
                <b data-target-value={t.product}>{t.value}</b>
                <button type="button" disabled={paused} aria-label={`Raise ${t.product} target`} onClick={click(() => on.target(b.id, t.product, 5))}>+</button>
              </div>
            ))}
          </div>
        )}
        {b.canCycleRecipe && (
          <button type="button" disabled={paused} onClick={click(() => on.recipe(b.id))}>
            Next recipe
          </button>
        )}
        {b.upgrade && (
          <div class="base-upgrade" data-upgrade>
            <button type="button" disabled={paused || b.upgrade.blocked !== null} onClick={click(() => on.upgrade(b.id, b.upgrade!.tier))}>
              Upgrade to tier {b.upgrade.tier === 2 ? 'II' : 'III'}
            </button>
            <p class="base-note">{b.upgrade.effect}. Costs {b.upgrade.cost}.</p>
            {b.upgrade.blocked && <p class="base-why">{b.upgrade.blocked}</p>}
          </div>
        )}
        <Demolish
          key={b.id}
          label={b.label}
          salvage={b.salvage}
          blocked={b.demolishBlocked}
          disabled={paused}
          onConfirm={() => on.demolish(b.id)}
        />
      </div>
      {b.demolishBlocked && <p class="base-why">{b.demolishBlocked}</p>}
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
  const withResearch: Array<[BaseSection, string]> = state.view.tree ? [...SECTIONS, ['research', 'Research tree']] : SECTIONS;
  const sections = state.legacy ? [...withResearch, ['legacy', 'Legacy console'] as [BaseSection, string]] : withResearch;
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
        {state.section === 'overview' && <Overview view={state.view} open={id => { on.select(id); on.section('buildings'); }} analyse={on.analyse} study={on.study} studyCore={on.studyCore} research={on.research} fit={on.fit} send={on.send} beacon={on.beacon} reserve={on.reserve} paused={state.paused} />}
        {state.section === 'buildings' && <Buildings state={state} on={on} />}
        {state.section === 'ship' && <Ship view={state.view} />}
        {state.section === 'research' && state.view.tree && <ResearchView view={state.view.tree} paused={state.paused} on={{ start: on.research, fit: on.fit }} />}
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
