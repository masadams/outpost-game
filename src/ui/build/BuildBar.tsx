import { h, render } from 'preact';
import type { JSX } from 'preact';
import type { BuildType } from '../../sim/colonyConfig';
import type { BuildGroup, BuildView, CardView, OrderView } from './buildView';

export interface BuildHandlers {
  select: (kind: BuildType) => void;
  group: (group: BuildGroup) => void;
  cancel: (orderId: number) => void;
  close: () => void;
}

const ICON: Partial<Record<BuildType, string>> = {
  solar: 'M3 15l3-8h12l3 8z M9 7l-1.5 8 M15 7l1.5 8 M4.5 11h15 M12 15v5 M8 20h8',
  battery: 'M5 5h14v15H5z M9 3h6 M12.5 8L10 12.5h4L11.5 17',
  storage: 'M3 8l9-4 9 4v10l-9 4-9-4z M3 8l9 4 9-4 M12 12v10',
  refinery: 'M3 20V11l5 3V11l5 3V6h4v14z M17 6V3h3v17 M3 20h18',
  fuelProcessor: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z M9 14h6',
};
const FALLBACK = 'M4 20h16 M6 20V10h12v10 M9 10V6h6v4';

function keep(action: () => void) {
  return (event: JSX.TargetedMouseEvent<HTMLButtonElement>) => {
    action();
    if (event.detail > 0) event.currentTarget.blur();
  };
}

function Card({ card, disabled, select }: { card: CardView; disabled: boolean; select: (kind: BuildType) => void }) {
  return (
    <button
      type="button"
      class="build-card"
      data-select={card.kind}
      data-affordable={String(!card.missing)}
      aria-pressed={card.selected}
      disabled={disabled}
      onClick={keep(() => select(card.kind))}
    >
      <span class="build-card-top">
        <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d={ICON[card.kind] ?? FALLBACK} />
        </svg>
        <span class="build-card-name">{card.label}</span>
        {card.hotkey && <kbd aria-hidden="true">{card.hotkey}</kbd>}
      </span>
      <span class="build-card-cost">
        {card.cost.map((c, i) => (
          <span key={c.product} data-short={String(c.short)}>
            {i > 0 && ' · '}
            {c.need} {c.product}
          </span>
        ))}
      </span>
      <span class={card.missing ? 'build-card-missing' : 'build-card-purpose'}>{card.missing ?? card.purpose}</span>
    </button>
  );
}

function Order({ order, cancel }: { order: OrderView; cancel: (id: number) => void }) {
  return (
    <li class="build-order" data-order={order.id} data-paused={String(order.paused)}>
      <span class="build-order-name">{order.label}</span>
      <span class="build-order-meter" aria-hidden="true">
        <i style={{ width: `${(order.fraction * 100).toFixed(0)}%` }} />
      </span>
      <span class="build-order-status">{order.paused ? 'paused' : `${(order.fraction * 100).toFixed(0)}%`}</span>
      <button type="button" class="build-order-cancel" aria-label={`Cancel ${order.label}`} onClick={keep(() => cancel(order.id))}>
        ×
      </button>
    </li>
  );
}

export function BuildBarView({ view, on }: { view: BuildView; on: BuildHandlers }) {
  const blocked = view.blocked !== null;
  return (
    <section class="build-bar" aria-label="Build" data-where={view.where} data-blocked={String(blocked)}>
      <header class="build-head">
        <span class="build-title">Build</span>
        <ul class="build-resources" aria-label="Materials and power">
          {view.resources.map(r => (
            <li key={r.key} data-resource={r.key} data-level={r.level}>
              <span>{r.label}</span>
              <strong>{r.value}</strong>
            </li>
          ))}
        </ul>
        <button type="button" class="build-close" aria-label="Stop building" onClick={keep(on.close)}>
          Done <kbd aria-hidden="true">B</kbd>
        </button>
      </header>
      {view.groups && (
        <nav class="build-groups" aria-label="Building groups">
          {view.groups.map(g => (
            <button
              key={g.id}
              type="button"
              aria-pressed={g.active}
              onClick={keep(() => on.group(g.id as BuildGroup))}
            >
              {g.label}
            </button>
          ))}
        </nav>
      )}
      <div class="build-cards">
        {view.cards.map(card => (
          <Card key={card.kind} card={card} disabled={blocked} select={on.select} />
        ))}
      </div>
      <footer class="build-foot">
        <p class="build-hint" role="status" data-blocked={String(blocked)}>
          {view.crew ? `${view.crew} · ` : ''}
          {view.hint}
        </p>
        {view.queue.length > 0 && (
          <ol class="build-queue" aria-label="Construction queue">
            {view.queue.map(order => (
              <Order key={order.id} order={order} cancel={on.cancel} />
            ))}
          </ol>
        )}
      </footer>
    </section>
  );
}

/** Small label next to the cursor while placing. */
export function CursorTip({ text, ok, x, y }: { text: string; ok: boolean; x: number; y: number }) {
  return (
    <div id="build-pointer-tip" class="cursor-tip" data-ok={String(ok)} role="status" style={{ left: `${x}px`, top: `${y}px` }}>
      {text}
    </div>
  );
}

export class BuildBar {
  readonly host = document.createElement('div');
  readonly tipHost = document.createElement('div');

  constructor(private handlers: BuildHandlers) {
    this.host.id = 'build-bar-host';
    this.tipHost.id = 'build-tip-host';
  }

  update(view: BuildView | null): void {
    render(view ? h(BuildBarView, { view, on: this.handlers }) : null, this.host);
  }

  tip(tip: { text: string; ok: boolean; x: number; y: number } | null): void {
    render(tip ? h(CursorTip, tip) : null, this.tipHost);
  }

  destroy(): void {
    render(null, this.host);
    render(null, this.tipHost);
    this.host.remove();
    this.tipHost.remove();
  }
}
