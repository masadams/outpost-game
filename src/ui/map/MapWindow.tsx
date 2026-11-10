import type { JSX } from 'preact';
import { useRef, useState } from 'preact/hooks';
import type { Destination } from '../../sim/explorationConfig';
import type { Vec } from '../../sim/math';
import type { MapView } from './mapView';

export interface MapHandlers {
  select: (id: Destination) => void;
  visit: () => void;
  mark: (point: Vec) => void;
  zoom: (action: 'in' | 'out' | 'fit' | 'focus') => void;
}

export interface MapState {
  view: MapView;
  paused: boolean;
  zoom: number;
  focus: boolean;
}

const W = 1000;
const H = 640;

function click(action: () => void) {
  return (event: JSX.TargetedMouseEvent<HTMLButtonElement>) => {
    action();
    if (event.detail > 0) event.currentTarget.blur();
  };
}

/** How the chart is looking: the whole system or the area around home, nudged by dragging (metres). */
export interface ChartView { mode: 'system' | 'home'; pan: Vec }

/** Metres across the "Home area" view. */
const HOME_SPAN = 16000;

/** Projects world metres into the chart's 1000×640 drawing space. */
function projection(state: MapState, chart: ChartView = { mode: 'system', pan: { x: 0, y: 0 } }) {
  const { bounds, places } = state.view;
  const target = places.find(p => p.selected)?.at;
  const home = state.view.pad;
  const base = state.focus && target ? target : chart.mode === 'home' ? home : { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
  const centre = { x: base.x + chart.pan.x, y: base.y + chart.pan.y };
  // Metres per drawing unit: fit everything (or the home area), but never zoom in closer than a 3 km square.
  const fit = chart.mode === 'home' ? HOME_SPAN / Math.min(W, H) : Math.max((bounds.maxX - bounds.minX) / W, (bounds.maxY - bounds.minY) / H);
  const metresPerUnit = Math.max(fit, 3000 / Math.min(W, H));
  const k = (0.9 / metresPerUnit) * state.zoom;
  return {
    k,
    at: (p: Vec) => ({ x: W / 2 + (p.x - centre.x) * k, y: H / 2 + (p.y - centre.y) * k }),
  };
}

function Chart({ state, on, chart, pan }: { state: MapState; on: MapHandlers; chart: ChartView; pan: (by: Vec) => void }) {
  const { view } = state;
  const { k, at } = projection(state, chart);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const ship = at(view.ship);
  const pad = at(view.pad);
  const selected = view.places.find(p => p.selected);
  const target = selected ? at(selected.at) : null;
  const pick = (event: MouseEvent) => {
    // The end of a drag is not a click.
    if (drag.current?.moved) { drag.current = null; return; }
    drag.current = null;
    const svg = event.currentTarget as SVGSVGElement;
    const box = svg.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * W;
    const y = ((event.clientY - box.top) / box.height) * H;
    const nearest = view.places
      .map(p => ({ p, d: Math.hypot(at(p.at).x - x, at(p.at).y - y) }))
      .sort((a, b) => a.d - b.d)[0];
    if (nearest && nearest.d < 60) {
      on.select(nearest.p.id);
      return;
    }
    // Empty space: mark that point.
    const origin = at({ x: 0, y: 0 });
    on.mark({ x: (x - origin.x) / k, y: (y - origin.y) / k });
  };
  return (
    <svg class="map-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Chart of nearby space. Click a place to select it, or empty space to mark a point." onClick={pick}
      onPointerDown={e => { drag.current = { x: e.clientX, y: e.clientY, moved: false }; }}
      onPointerMove={e => {
        const d = drag.current;
        if (!d || (e.buttons & 1) === 0) return;
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < 5) return;
        d.moved = true;
        const box = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        pan({ x: (-dx * W) / box.width / k, y: (-dy * H) / box.height / k });
        d.x = e.clientX;
        d.y = e.clientY;
      }}
      onWheel={e => { e.preventDefault(); on.zoom(e.deltaY < 0 ? 'in' : 'out'); }}>
      <defs>
        <pattern id="map-grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M50 0H0V50" class="map-grid-line" />
        </pattern>
      </defs>
      <rect width={W} height={H} class="map-bg" />
      <rect width={W} height={H} fill="url(#map-grid)" />
      {view.bodies.map(b => {
        const c = at(b.at);
        return (
          <g key={b.id} class="map-body" data-body={b.id}>
            {b.atmosphere > 0 && <circle cx={c.x} cy={c.y} r={(b.radius + b.atmosphere) * k} class="map-atmosphere" />}
            <circle cx={c.x} cy={c.y} r={Math.max(4, b.radius * k)} class="map-planet" />
            <text x={c.x} y={c.y + Math.max(4, b.radius * k) + 22} class="map-label" text-anchor="middle">
              {b.label}
            </text>
          </g>
        );
      })}
      {view.belts.map(b =>
        b.rocks.map((r, i) => {
          const c = at(r.at);
          return <circle key={`${b.id}-${i}`} cx={c.x} cy={c.y} r={3.5} fill={b.color} class="map-rock" />;
        }),
      )}
      {view.sites.map(s => {
        const c = at(s.at);
        return <circle key={s.id} cx={c.x} cy={c.y} r={7} class="map-site" data-intact={String(s.intact)} />;
      })}
      {view.places.filter(p => p.id === 'mark').map(p => (
        <g key="mark" class="map-mark" aria-label="Marked point">
          <path d={`M${at(p.at).x - 8} ${at(p.at).y}H${at(p.at).x + 8}M${at(p.at).x} ${at(p.at).y - 8}V${at(p.at).y + 8}`} />
        </g>
      ))}
      {view.intercept && (
        <g class="map-intercept" aria-label={`Aim point, about ${Math.round(view.intercept.seconds)} seconds away`}>
          <circle cx={at(view.intercept.at).x} cy={at(view.intercept.at).y} r={9} />
          <circle cx={at(view.intercept.at).x} cy={at(view.intercept.at).y} r={2} />
        </g>
      )}
      {view.echo && (
        <g class="map-echo" aria-label={`Far signal: ${view.echo.label}`}>
          <path
            d="M0 0 L-9 -5 L-9 5 Z"
            transform={`translate(${W / 2 + Math.cos(view.echo.bearing) * (W / 2 - 40)} ${H / 2 + Math.sin(view.echo.bearing) * (H / 2 - 28)}) rotate(${(view.echo.bearing * 180) / Math.PI})`}
          />
          <text
            x={W / 2 + Math.cos(view.echo.bearing) * (W / 2 - 60)}
            y={H / 2 + Math.sin(view.echo.bearing) * (H / 2 - 42)}
            class="map-label"
            text-anchor="middle"
          >
            {view.echo.label}
          </text>
        </g>
      )}
      {view.pods.map((p, i) => (
        <g key={`pod-${i}`} class="map-pod-flight" aria-label={p.label}>
          <line x1={at(p.from).x} y1={at(p.from).y} x2={at(p.to).x} y2={at(p.to).y} class="map-pod-lane" />
          <circle cx={at(p.to).x} cy={at(p.to).y} r={5} class="map-pod-target" />
          <path
            d="M7 0 L-5 -4 L-3 0 L-5 4 Z"
            class="map-pod"
            transform={`translate(${at(p.at).x} ${at(p.at).y}) rotate(${(p.heading * 180) / Math.PI})`}
          />
          <text x={at(p.at).x} y={at(p.at).y - 11} class="map-label map-pod-label" text-anchor="middle">{p.eta}</text>
        </g>
      ))}
      {view.beacons.map(b => (
        <g key={`beacon-${b.id}`} class="map-beacon" data-kind={b.kind} aria-label={b.label}>
          <circle cx={at(b.at).x} cy={at(b.at).y} r={6} />
          <circle cx={at(b.at).x} cy={at(b.at).y} r={11} class="map-beacon-ring" />
          <text x={at(b.at).x} y={at(b.at).y - 16} class="map-label" text-anchor="middle">{b.label}</text>
        </g>
      ))}
      {view.probes.map((p, i) => (
        <circle key={`probe-${i}`} cx={at(p.at).x} cy={at(p.at).y} r={3.5} class="map-probe" aria-label="Survey probe" />
      ))}
      {view.wrecks.map(x => (
        <g key={x.id} class="map-wreck" aria-label={x.label}>
          <rect x={at(x.at).x - 6} y={at(x.at).y - 6} width={12} height={12} class="map-wreck-mark" />
          <text x={at(x.at).x} y={at(x.at).y - 14} class="map-label map-wreck-label" text-anchor="middle">
            {x.label}
          </text>
        </g>
      ))}
      {view.storm && (
        <g class="map-storm" aria-label={`Incoming storm. ${view.storm.line}`}>
          {view.storm.zone && (
            <circle
              cx={at(view.storm.zone.at).x}
              cy={at(view.storm.zone.at).y}
              r={Math.max(8, view.storm.zone.radius * k)}
              class="map-zone"
            />
          )}
          {view.storm.rocks.map((r, i) => {
            const c = at(r.at);
            return (
              <g key={i} data-off-chart={String(r.offChart)}>
                <circle cx={c.x} cy={c.y} r={Math.max(6, view.storm!.doubt * k)} class="map-doubt" />
                <circle cx={c.x} cy={c.y} r={3} class="map-incoming" />
              </g>
            );
          })}
          {view.storm.zone && (
            <text x={at(view.storm.zone.at).x} y={at(view.storm.zone.at).y - Math.max(8, view.storm.zone.radius * k) - 8} class="map-label map-zone-label" text-anchor="middle">
              Landing zone
            </text>
          )}
        </g>
      )}
      <rect x={pad.x - 7} y={pad.y - 3} width={14} height={6} class="map-pad" />
      {target && <line x1={ship.x} y1={ship.y} x2={target.x} y2={target.y} class="map-bearing" data-blocked={String(view.selected.blocked)} />}
      <circle cx={ship.x} cy={ship.y} r={6} class="map-ship" />
      <text x={ship.x + 12} y={ship.y - 10} class="map-label map-you">
        You
      </text>
      {target && (
        <g class="map-select">
          <path d={`M${target.x - 22} ${target.y - 12}V${target.y - 22}H${target.x - 12} M${target.x + 12} ${target.y - 22}H${target.x + 22}V${target.y - 12} M${target.x + 22} ${target.y + 12}V${target.y + 22}H${target.x + 12} M${target.x - 12} ${target.y + 22}H${target.x - 22}V${target.y + 12}`} />
        </g>
      )}
    </svg>
  );
}

function Inspector({ state, on }: { state: MapState; on: MapHandlers }) {
  const s = state.view.selected;
  return (
    <aside class="map-inspector" aria-label={`${s.label} details`}>
      <h3>Selected</h3>
      <div class="map-title">
        <strong>{s.label}</strong>
        <span class="map-state" data-state={s.state}>
          {s.kind} · {s.state}
        </span>
      </div>
      {s.body && <p class="map-body-text">{s.body}</p>}
      <dl class="map-facts">
        {s.facts.map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {s.blocked && <p class="map-warning">The planet is in the way.</p>}
      {s.action && (
        <div class="map-action">
          <button type="button" disabled={state.paused || !s.action.enabled} data-visit="true" onClick={click(on.visit)}>
            {s.action.label} [E]
          </button>
          <p>{s.action.reason}</p>
        </div>
      )}
      <p class="map-note">{state.view.note}</p>
    </aside>
  );
}

/** The place list, grouped so a long list stays easy to scan. */
function groupOf(kind: string): string {
  if (kind === 'Your outpost' || kind.startsWith('Outpost')) return 'Your bases';
  if (kind === 'Ore cluster') return 'Ore clusters';
  if (kind === 'Moon' || kind.endsWith('world') || kind === 'World') return 'Worlds';
  return 'Other';
}
const GROUP_ORDER = ['Your bases', 'Worlds', 'Ore clusters', 'Other'];

export function MapWindowView({ state, on }: { state: MapState; on: MapHandlers }) {
  const [chart, setChart] = useState<ChartView>({ mode: 'home', pan: { x: 0, y: 0 } });
  const groups = GROUP_ORDER.map(g => ({ g, places: state.view.places.filter(p => groupOf(p.kind) === g) })).filter(x => x.places.length > 0);
  const view = (mode: ChartView['mode']) => { setChart({ mode, pan: { x: 0, y: 0 } }); on.zoom('fit'); };
  return (
    <div class="map-window">
      <nav class="map-places" aria-label="Places">
        {groups.map(({ g, places }) => (
          <div key={g} class="map-group">
            <h4>{g}</h4>
            {places.map(p => (
              <button key={p.id} type="button" data-destination={p.id} aria-label={p.label} aria-pressed={p.selected} onClick={click(() => on.select(p.id))}>
                {p.label}
                <small>{p.kind}</small>
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div class="map-chart-wrap">
        <Chart state={state} on={on} chart={chart} pan={by => setChart(c => ({ ...c, pan: { x: c.pan.x + by.x, y: c.pan.y + by.y } }))} />
        <div class="map-tools">
          <button type="button" aria-pressed={!state.focus && chart.mode === 'home'} onClick={click(() => view('home'))}>Home area</button>
          <button type="button" aria-pressed={!state.focus && chart.mode === 'system'} onClick={click(() => view('system'))}>Whole system</button>
          <button type="button" aria-pressed={state.focus} onClick={click(() => on.zoom('focus'))}>Focus target</button>
          <button type="button" aria-label="Zoom chart in" onClick={click(() => on.zoom('in'))}>+</button>
          <button type="button" aria-label="Zoom chart out" onClick={click(() => on.zoom('out'))}>−</button>
        </div>
        <p class="map-hint">Scroll to zoom · drag to move · click a place to select it</p>
      </div>
      <Inspector state={state} on={on} />
    </div>
  );
}
