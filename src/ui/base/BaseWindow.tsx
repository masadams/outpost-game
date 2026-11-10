import { ResearchView } from './ResearchTree';
import { useState } from 'preact/hooks';
import { h, render } from 'preact';
import type { JSX } from 'preact';
import type { BaseView, BuildingView, Chip, ExpeditionView } from './baseView';
import { Demolish } from './Demolish';

export type BaseSection = 'overview' | 'research' | 'buildings' | 'logistics' | 'expedition' | 'ship' | 'legacy';

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
  expedition: (kit: { fuel: boolean; shielding: boolean; stores: boolean }, target: number | null) => void;
  choose: (key: string) => void;
  supplyToggle: () => void;
  supplyReserve: (body: string, resource: string, delta: number) => void;
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

function Expedition({ view, paused, send, choose }: { view: ExpeditionView; paused: boolean; send: (kit: { fuel: boolean; shielding: boolean; stores: boolean }, target: number | null) => void; choose: (key: string) => void }) {
  const [kit, setKit] = useState({ fuel: false, shielding: false, stores: false });
  const [goal, setGoal] = useState<number | null>(null);
  const key = `${(['fuel', 'shielding', 'stores'] as const).filter(k => kit[k]).join('+')}|${goal === null ? 's' : goal}`;
  const plan = view.plans[key] ?? view.plans[`${key.split('|')[0]}|s`];
  return (
    <div class="base-expedition" data-expedition={view.state}>
      <h4>Expedition</h4>
      <p>{view.line}</p>
      {view.report && (
        <div class="base-report" data-result={view.report.result}>
          <strong>{view.report.result === 'lost' ? 'Lost' : view.report.result === 'full' ? 'A clean run' : view.report.result === 'partial' ? 'Home, battered' : 'Barely home'}</strong>
          {view.report.lines.map(l => <p key={l} class="base-note">{l}</p>)}
        </div>
      )}
      {view.log.length > 0 && view.state !== 'plan' && view.log.map(l => <p key={l} class="base-note">{l}</p>)}
      {view.trouble && (
        <div class="base-trouble" data-trouble>
          <strong>{view.trouble.title}</strong>
          <p class="base-note">It decides for itself in about {view.trouble.minutes} min (it waits it out).</p>
          {view.trouble.choices.map(c => (
            <div key={c.key}>
              <button type="button" class="base-analyse" data-choice={c.key} data-safe={String(c.safe)} disabled={paused} onClick={() => choose(c.key)}>{c.label}</button>
              <small class="base-note"> {c.detail}</small>
            </div>
          ))}
        </div>
      )}
      <div class="base-worlds" aria-label="The far system's worlds">
        {view.worlds.map(f => <p key={f.index} class="base-note" data-world={f.index}><strong>{f.name}</strong> · {f.line}</p>)}
      </div>
      {view.state === 'plan' && (
        <div>
          <label class="base-pack">
            <input type="radio" name="expedition-goal" checked={goal === null} onChange={() => setGoal(null)} />
            Fly past and survey the next world
          </label>
          {view.worlds.filter(f => f.landable).map(f => (
            <label key={f.index} class="base-pack">
              <input type="radio" name="expedition-goal" checked={goal === f.index} onChange={() => setGoal(f.index)} />
              Land on {f.name}
            </label>
          ))}
          {view.packs.map(p => (
            <label key={p.key} class="base-pack">
              <input type="checkbox" checked={kit[p.key]} onChange={() => setKit({ ...kit, [p.key]: !kit[p.key] })} />
              {p.label} <small>{p.cost}</small>
            </label>
          ))}
          <p class="base-note">Costs {plan.cost}. {plan.odds}.</p>
          <button type="button" class="base-analyse" data-expedition-go disabled={paused || plan.reason !== null} onClick={() => send(kit, goal)}>
            Send the expedition
          </button>
          {plan.reason && <p class="base-why">{plan.reason}</p>}
        </div>
      )}
    </div>
  );
}

type Go = (section: BaseSection) => void;
interface SectionProps { view: BaseView; paused: boolean; on: BaseHandlers }

/** What needs you now, what you have, and what is going on: short, so it reads at a glance. */
function Overview({ view, paused, on, go }: SectionProps & { go: Go }) {
  const p = view.power;
  const products = view.stocks.filter(s => s.group === 'product');
  const ore = view.stocks.filter(s => s.group === 'ore');
  const open = (id: number) => { on.select(id); go('buildings'); };
  const reserve = on.reserve;
  const active = view.tree?.nodes.filter(n => n.state === 'active') ?? [];
  const waitingFinds = (view.research?.filter(r => r.action?.kind === 'research' && !r.action.reason).length ?? 0) + (view.core && !view.core.studied && !view.core.blocked ? 1 : 0) + (view.crystal && !view.crystal.studied && !view.crystal.blocked ? 1 : 0) + (view.storm && !view.storm.analysed && !view.storm.blocked ? 1 : 0);
  const ready = view.tree?.nodes.filter(n => n.state === 'ready').length ?? 0;
  return (
    <div class="base-main base-overview" data-base-section="overview">
      <section class="overview-attention">
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
      </section>
      <div class="overview-grid">
        <section class="overview-card" aria-label="Materials">
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
        </section>
        <section class="overview-card" aria-label="Power">
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
        </section>
      </div>
      <section class="overview-card overview-activity" aria-label="What is going on">
        <h3>What is going on</h3>
        {(view.tree || view.research) && (
          <div class="overview-line">
            <span>
              {active.length ? `Researching ${active.map(n => `${n.label} (${Math.round((n.progress ?? 0) * 100)}%)`).join(', ')}.` : 'Nothing is being researched.'}
              {waitingFinds > 0 ? ` ${waitingFinds} find${waitingFinds > 1 ? 's' : ''} waiting to be studied.` : ''}
              {!active.length && ready > 0 ? ` ${ready} ready to start.` : ''}
            </span>
            <button type="button" class="overview-go" data-go="research" onClick={click(() => go('research'))}>Research</button>
          </div>
        )}
        {(view.pods || view.supply || view.elsewhere.length > 0) && (
          <div class="overview-line">
            <span>
              {view.elsewhere.length > 0 ? `${view.elsewhere.length} other base${view.elsewhere.length > 1 ? 's' : ''}. ` : ''}
              {view.pods?.flying.length ? `${view.pods.flying.length} pod${view.pods.flying.length > 1 ? 's' : ''} on the way. ` : ''}
              {view.supply ? `Supply lines ${view.supply.enabled ? 'on' : 'off'}.` : ''}
            </span>
            <button type="button" class="overview-go" data-go="logistics" onClick={click(() => go('logistics'))}>Logistics</button>
          </div>
        )}
        {view.signal && (
          <div class="overview-line">
            <span>{view.signal.line}</span>
            <button type="button" class="overview-go" data-go="expedition" onClick={click(() => go('expedition'))}>Expedition</button>
          </div>
        )}
        {!view.tree && !view.research && !view.pods && !view.supply && !view.signal && view.elsewhere.length === 0 && (
          <p class="base-note">Just the home base for now.</p>
        )}
      </section>
    </div>
  );
}

/** One place for research: what is running, finds to study, what can start now, then the whole tree. */
function ResearchHub({ view, paused, on }: SectionProps) {
  const analyse = on.analyse, study = on.study, studyCore = on.studyCore, research = on.research, fit = on.fit;
  const tree = view.tree;
  const active = tree?.nodes.filter(n => n.state === 'active') ?? [];
  const ready = tree?.nodes.filter(n => n.state === 'ready') ?? [];
  // Only finds you have and can act on: nothing is listed before it is found.
  const readyIds = new Set((tree?.nodes ?? []).filter(n => n.state === 'ready').map(n => n.id as string));
  const findRows = (view.research ?? []).filter(r => (r.action !== null && !(r.action.kind === 'research' && readyIds.has(r.action.tech))) || r.progress !== null);
  const hasFinds = findRows.length > 0 || !!(view.storm && !view.storm.analysed) || !!(view.core && !view.core.studied) || !!(view.crystal && !view.crystal.studied);
  return (
    <div class="base-main research-hub" data-base-section="research">
      {tree && (
        <section class="overview-card research-now" aria-label="Researching now">
          <h3>Researching now</h3>
          {!tree.hasLab && <p class="base-why">Research needs a powered Research lab.</p>}
          {active.length ? active.map(n => (
            <div key={n.id} class="research-active" data-active={n.id}>
              <strong>{n.label}</strong>
              <span class="ship-meter" aria-hidden="true"><i style={{ width: `${Math.round((n.progress ?? 0) * 100)}%` }} /></span>
              <small>{Math.round((n.progress ?? 0) * 100)}% · {n.line}</small>
            </div>
          )) : <p class="base-note">Nothing is being researched. Pick something below.</p>}
        </section>
      )}
      {hasFinds && (
        <section class="overview-card" aria-label="Finds">
          <h3>Finds to study</h3>
          <div class="research-ready-list">
            {findRows.map(row => (
              <div key={row.id} class="research-ready-row" data-find={row.id}>
                <div>
                  <strong>{row.find}</strong>
                  <small>{row.line}</small>
                  {row.progress !== null && <span class="ship-meter" aria-hidden="true"><i style={{ width: `${(row.progress * 100).toFixed(0)}%` }} /></span>}
                </div>
                {row.action && (
                  <button type="button" data-research={row.action.kind} disabled={paused || row.action.reason !== null} onClick={click(() => (row.action!.kind === 'research' ? research(row.action!.tech) : fit(row.action!.upgrade ?? '')))}>
                    {row.action.kind === 'research' ? 'Start' : 'Fit'}
                  </button>
                )}
                {row.action?.reason && <small class="base-why">{row.action.reason}</small>}
              </div>
            ))}
            {view.storm && !view.storm.analysed && (
              <div class="research-ready-row" data-analysed="false" aria-label="Storm pieces">
                <div>
                  <strong>Storm pieces</strong>
                  <small>{view.storm.line} On the ground: {view.storm.onGround} · Carrying: {view.storm.held}</small>
                </div>
                <button type="button" class="base-analyse" disabled={view.storm.blocked !== null} onClick={click(analyse)}>Analyse a piece</button>
                {view.storm.blocked && <small class="base-why">{view.storm.blocked}</small>}
              </div>
            )}
            {view.core && !view.core.studied && (
              <div class="research-ready-row" data-studied="false" aria-label="Cinder core sample">
                <div><strong>Cinder core sample</strong><small>{view.core.line}</small></div>
                <button type="button" data-study-core="true" disabled={view.core.blocked !== null} onClick={click(studyCore)}>Study the core sample</button>
                {view.core.blocked && <small class="base-why">{view.core.blocked}</small>}
              </div>
            )}
            {view.crystal && !view.crystal.studied && (
              <div class="research-ready-row" data-studied="false" aria-label="Nacre crystal">
                <div><strong>Nacre crystal</strong><small>{view.crystal.line}</small></div>
                <button type="button" data-study="true" disabled={view.crystal.blocked !== null} onClick={click(study)}>Study the crystal</button>
                {view.crystal.blocked && <small class="base-why">{view.crystal.blocked}</small>}
              </div>
            )}
          </div>
        </section>
      )}
      {tree && (
        <section class="overview-card research-ready" aria-label="Ready to start">
          <h3>Ready to start</h3>
          {ready.length ? (
            <div class="research-ready-list">
              {ready.map(n => (
                <div key={n.id} class="research-ready-row" data-ready={n.id}>
                  <div>
                    <strong>{n.label}</strong>
                    <small>Costs {n.cost} · {n.seconds} s{n.unlocks.length ? ` · opens ${n.unlocks.slice(0, 2).join(', ')}${n.unlocks.length > 2 ? '…' : ''}` : ''}</small>
                  </div>
                  <button type="button" disabled={paused || n.start?.reason != null} onClick={click(() => research(n.id))}>Start</button>
                  {n.start?.reason && <small class="base-why">{n.start.reason}</small>}
                </div>
              ))}
            </div>
          ) : <p class="base-note">Nothing can be started right now. The tree below shows what each technology still needs.</p>}
        </section>
      )}
      {tree && (
        <section class="research-all" aria-label="All research">
          <h3>All research</h3>
          <ResearchView view={tree} paused={paused} on={{ start: research, fit }} />
        </section>
      )}
    </div>
  );
}

/** Moving ore between worlds: pods, supply lines, and how the other bases are doing. */
function Logistics({ view, paused, on }: SectionProps) {
  const send = on.send;
  const supply = { toggle: on.supplyToggle, reserve: on.supplyReserve };
  return (
    <div class="base-main" data-base-section="logistics">
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
      {view.supply && (
        <section class="base-storm" aria-label="Supply lines" data-supply={String(view.supply.enabled)}>
          <h3>Supply lines</h3>
          <p class="base-note">Keep each world stocked to a reserve of ore. Pods are sent on their own from worlds with some to spare.</p>
          <button type="button" class="base-analyse" data-supply-toggle aria-pressed={view.supply.enabled} disabled={paused} onClick={click(supply.toggle)}>
            Automatic supply: {view.supply.enabled ? 'on' : 'off'}
          </button>
          <div class="base-supply">
            {view.supply.worlds.map(world => (
              <div key={world.body} class="base-supply-world" data-supply-world={world.body}>
                <strong>{world.label}</strong>
                {world.cells.map(c => (
                  <span key={c.resource} class="base-supply-cell" title={`${c.have} kg in the depot`}>
                    {c.label}
                    <button type="button" aria-label={`Lower ${world.label} ${c.label} reserve`} disabled={paused || c.reserve <= 0} onClick={click(() => supply.reserve(world.body, c.resource, -10))}>−</button>
                    <b data-reserve-value={`${world.body}:${c.resource}`}>{c.reserve}</b>
                    <button type="button" aria-label={`Raise ${world.label} ${c.label} reserve`} disabled={paused} onClick={click(() => supply.reserve(world.body, c.resource, 10))}>+</button>
                    <small>{c.have} kg</small>
                  </span>
                ))}
              </div>
            ))}
          </div>
          <p class="base-note" data-supply-line>{view.supply.line}</p>
        </section>
      )}
    </div>
  );
}

/** The deep signal and the expedition to the far system. */
function ExpeditionSection({ view, paused, on }: SectionProps) {
  const beacon = on.beacon, expedition = on.expedition, choose = on.choose;
  return (
    <div class="base-main" data-base-section="expedition">
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
          {view.signal.expedition && <Expedition view={view.signal.expedition} paused={paused} send={expedition} choose={choose} />}
          {view.signal.state === 'ready' && (
            <button type="button" class="base-analyse" data-beacon disabled={view.signal.reason !== null || paused} onClick={click(beacon)}>
              Launch the beacon
            </button>
          )}
          {view.signal.reason && <p class="base-why">{view.signal.reason}</p>}
        </section>
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

/** The sections that make sense now: each one only appears once there is something in it. */
function sectionsFor(view: BaseView, legacy: boolean): Array<[BaseSection, string]> {
  const list: Array<[BaseSection, string]> = [['overview', 'Overview']];
  if (view.tree || view.research || view.core || view.crystal || view.storm) list.push(['research', 'Research']);
  list.push(['buildings', 'Buildings']);
  if (view.pods || view.supply || view.elsewhere.length > 0) list.push(['logistics', 'Logistics']);
  if (view.signal) list.push(['expedition', 'Expedition']);
  list.push(['ship', 'Lander']);
  if (legacy) list.push(['legacy', 'Legacy console']);
  return list;
}

export function BaseWindowView({ state, on, legacyHost }: { state: BaseState; on: BaseHandlers; legacyHost: (el: HTMLElement | null) => void }) {
  const sections = sectionsFor(state.view, state.legacy);
  const section = sections.some(([id]) => id === state.section) ? state.section : 'overview';
  return (
    <div class="base-window" data-section={section}>
      <nav class="base-nav" aria-label="Base sections">
        {sections.map(([id, label]) => (
          <button key={id} type="button" data-base-nav={id} aria-pressed={section === id} onClick={click(() => on.section(id))}>
            {label}
          </button>
        ))}
        {!state.legacy && <p class="base-more">More sections open as your outpost grows.</p>}
      </nav>
      <div class="base-body">
        {section === 'overview' && <Overview view={state.view} paused={state.paused} on={on} go={on.section} />}
        {section === 'research' && <ResearchHub view={state.view} paused={state.paused} on={on} />}
        {section === 'buildings' && <Buildings state={state} on={on} />}
        {section === 'logistics' && <Logistics view={state.view} paused={state.paused} on={on} />}
        {section === 'expedition' && <ExpeditionSection view={state.view} paused={state.paused} on={on} />}
        {section === 'ship' && <Ship view={state.view} />}
        {/* The old console is mounted here by the HUD; Preact never touches its contents. */}
        <div class="base-legacy" hidden={section !== 'legacy'} ref={legacyHost} />
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
