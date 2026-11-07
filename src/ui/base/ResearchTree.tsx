import { h } from 'preact';
import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { NodeState, ResearchTreeView, TreeNode } from './researchTreeView';

export interface ResearchTreeHandlers {
  start: (tech: string) => void;
  fit: (upgrade: string) => void;
}

const COL_W = 196;
const ROW_H = 92;
const NODE_W = 170;
const NODE_H = 62;
const PAD = 14;

const STATE_LABEL: Record<NodeState, string> = { done: 'Done', active: 'Researching', ready: 'Ready', locked: 'Locked' };
const STATE_MARK: Record<NodeState, string> = { done: '✓', active: '◷', ready: '○', locked: '◇' };

function click(action: () => void) {
  return (event: JSX.TargetedMouseEvent<HTMLButtonElement>) => {
    action();
    if (event.detail > 0) event.currentTarget.blur();
  };
}

/** The right-hand side of a node's edge to the left-hand side of the next, as a smooth curve. */
function edgePath(from: TreeNode, to: TreeNode): string {
  const x1 = PAD + from.col * COL_W + NODE_W;
  const y1 = PAD + from.row * ROW_H + NODE_H / 2;
  const x2 = PAD + to.col * COL_W;
  const y2 = PAD + to.row * ROW_H + NODE_H / 2;
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
}

function Detail({ node, view, select, on, paused }: { node: TreeNode; view: ResearchTreeView; select: (id: string) => void; on: ResearchTreeHandlers; paused: boolean }) {
  const blocked = node.start?.reason ?? null;
  return (
    <aside class="tree-detail" aria-label={`${node.label} details`} data-state={node.state} data-tech-detail={node.id}>
      <p class="tree-state" data-state={node.state}>{STATE_MARK[node.state]} {STATE_LABEL[node.state]}</p>
      <h3>{node.label}</h3>
      <p>{node.line}</p>
      {node.progress !== null && (
        <div class="tree-progress" role="progressbar" aria-valuenow={Math.round(node.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: `${Math.round(node.progress * 100)}%` }} />
        </div>
      )}
      {node.requires.length > 0 && (
        <div class="tree-needs">
          <small>Needs</small>
          {node.requires.map(req => (
            <button type="button" key={req.id} data-done={String(req.done)} onClick={click(() => select(req.id))}>
              {req.done ? '✓' : '◇'} {req.label}
            </button>
          ))}
        </div>
      )}
      {node.unlocks.length > 0 && (
        <div class="tree-unlocks">
          <small>Opens</small>
          <ul>{node.unlocks.map(u => <li key={u}>{u}</li>)}</ul>
        </div>
      )}
      <p class="base-note">Costs {node.cost} · {node.seconds} s of lab work.</p>
      {node.start && (
        <div class="tree-actions">
          <button type="button" disabled={paused || blocked !== null} onClick={click(() => on.start(node.id))}>Start research</button>
          {blocked && <p class="base-why">{blocked}</p>}
        </div>
      )}
      <p class="base-note" hidden={view.hasLab}>Research needs a powered Research lab.</p>
    </aside>
  );
}

function Tree({ view, on, paused }: { view: ResearchTreeView; on: ResearchTreeHandlers; paused: boolean }) {
  const first = view.nodes.find(n => n.state === 'active') ?? view.nodes.find(n => n.state === 'ready') ?? view.nodes[0];
  const [picked, setPicked] = useState<string>(first.id);
  const node = view.nodes.find(n => n.id === picked) ?? first;
  const byId = new Map(view.nodes.map(n => [n.id, n]));
  const width = PAD * 2 + (view.columns - 1) * COL_W + NODE_W;
  const height = PAD * 2 + (view.rows - 1) * ROW_H + NODE_H;
  return (
    <div class="tree-layout">
      <div class="tree-scroll" tabIndex={0} aria-label="Research tree">
        <div class="tree-canvas" style={{ width: `${width}px`, height: `${height}px` }}>
          <svg class="tree-edges" width={width} height={height} aria-hidden="true">
            {view.edges.map(e => (
              <path key={`${e.from}-${e.to}`} d={edgePath(byId.get(e.from)!, byId.get(e.to)!)} data-done={String(e.done)} />
            ))}
          </svg>
          {view.nodes.map(n => (
            <button
              type="button"
              key={n.id}
              class="tree-node"
              data-state={n.state}
              data-tech={n.id}
              aria-pressed={n.id === node.id}
              style={{ left: `${PAD + n.col * COL_W}px`, top: `${PAD + n.row * ROW_H}px`, width: `${NODE_W}px`, height: `${NODE_H}px` }}
              onClick={click(() => setPicked(n.id))}
            >
              <span class="tree-mark">{STATE_MARK[n.state]}</span>
              <strong>{n.label}</strong>
              <small>{n.state === 'active' && n.progress !== null ? `${Math.round(n.progress * 100)}%` : STATE_LABEL[n.state]}</small>
            </button>
          ))}
        </div>
      </div>
      <Detail node={node} view={view} select={setPicked} on={on} paused={paused} />
    </div>
  );
}

function Parts({ view, on, paused }: { view: ResearchTreeView; on: ResearchTreeHandlers; paused: boolean }) {
  return (
    <div class="parts-grid" aria-label="Ship parts">
      <p class="base-note">Each slot holds one part. Research opens better parts; fitting happens at the home pad and costs materials.</p>
      {view.slots.map(slot => (
        <section class="part-slot" key={slot.slot} data-slot={slot.slot}>
          <header>
            <h4>{slot.label}</h4>
            <small>{slot.fitted ?? 'Standard'}</small>
          </header>
          <div class="part-row">
            {slot.parts.map(p => (
              <article class="part-card" key={p.id} data-part={p.id} data-state={p.state}>
                <strong>{p.label}</strong>
                <p>{p.benefit}</p>
                <small>{p.tradeoff}</small>
                <small>Costs {p.cost}</small>
                <small class="part-role">{p.role}</small>
                {p.state === 'fitted' && <span class="part-fitted">✓ Fitted</span>}
                {p.state !== 'fitted' && (
                  <button type="button" disabled={paused || p.reason !== null} onClick={click(() => on.fit(p.id))}>Fit</button>
                )}
                {p.reason && <small class="base-why">{p.reason}</small>}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Buildings({ view }: { view: ResearchTreeView }) {
  return (
    <div class="building-tree" aria-label="Buildings and their upgrades">
      <p class="base-note">Every building has two upgrade tiers. Tier II needs Infrastructure retrofits. Tier III needs Advanced facility systems and the technology of its family.</p>
      <div class="building-grid">
        {view.buildings.map(b => (
          <article class="building-card" key={b.kind} data-kind={b.kind} data-open={String(b.open)}>
            <header>
              <strong>{b.label}</strong>
              <small>{b.open ? `${b.built} built` : b.earned}</small>
            </header>
            <p>{b.purpose}</p>
            {b.tiers.map(t => (
              <div class="tier-step" key={t.tier} data-tier={t.tier} data-ready={String(t.needs.every(n => n.done))}>
                <span class="tier-name">Tier {t.tier === 2 ? 'II' : 'III'}</span>
                <span class="tier-effect">{t.effect}</span>
                <span class="tier-needs">
                  {t.needs.map(n => <em key={n.id} data-done={String(n.done)}>{n.done ? '✓' : '◇'} {n.label}</em>)}
                </span>
                {t.have > 0 && <small>{t.have} at this tier</small>}
              </div>
            ))}
          </article>
        ))}
      </div>
    </div>
  );
}

/** Research as a tree you read left to right, with the ship parts it opens on a second tab. */
export function ResearchView({ view, on, paused }: { view: ResearchTreeView; on: ResearchTreeHandlers; paused: boolean }) {
  const [tab, setTab] = useState<'tree' | 'parts' | 'buildings'>('tree');
  return (
    <div class="research-window" data-tab={tab}>
      <div class="research-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'tree'} onClick={click(() => setTab('tree'))}>Research tree</button>
        <button type="button" role="tab" aria-selected={tab === 'parts'} onClick={click(() => setTab('parts'))}>Ship parts</button>
        <button type="button" role="tab" aria-selected={tab === 'buildings'} onClick={click(() => setTab('buildings'))}>Buildings</button>
        <span class="tree-legend">◇ Locked · ○ Ready · ◷ Researching · ✓ Done</span>
      </div>
      {tab === 'tree' ? <Tree view={view} on={on} paused={paused} /> : tab === 'parts' ? <Parts view={view} on={on} paused={paused} /> : <Buildings view={view} />}
    </div>
  );
}

void h;
