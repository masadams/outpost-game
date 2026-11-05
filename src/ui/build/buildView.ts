import { featureVisible, blueprintVisible } from '../../preferences/features';
import { BLUEPRINTS, BUILD_TYPES, PRODUCTS, type BuildType, type Product } from '../../sim/colonyConfig';
import { availableProduct } from '../../sim/colonyPolicy';
import { CONSTRUCTION_SECONDS } from '../../sim/commandConfig';
import { inventoryMass } from '../../sim/resources';
import type { WorldState } from '../../sim/world';
import { GROUPS } from '../blueprints';

/** What the build bar shows, derived from the simulation. Pure: no DOM, no Phaser. */
export interface BuildView {
  /** Null when building is possible; otherwise one short line saying why not. */
  blocked: string | null;
  where: 'foot' | 'ship';
  hint: string;
  groups: GroupView[] | null;
  cards: CardView[];
  resources: ResourceView[];
  queue: OrderView[];
  crew: string | null;
}

export interface GroupView {
  id: string;
  label: string;
  active: boolean;
}

export interface CostView {
  product: Product;
  need: number;
  short: boolean;
}

export interface CardView {
  kind: BuildType;
  label: string;
  hotkey: string | null;
  purpose: string;
  cost: CostView[];
  /** "Needs 2 more wire", or null when affordable. */
  missing: string | null;
  selected: boolean;
}

export interface ResourceView {
  key: 'ore' | Product | 'power';
  label: string;
  value: string;
  level: 'neutral' | 'good' | 'bad';
}

export interface OrderView {
  id: number;
  label: string;
  fraction: number;
  status: string;
  paused: boolean;
}

const PURPOSE: Record<BuildType, string> = {
  solar: 'Makes power in sunlight',
  battery: 'Stores power for later',
  storage: 'Holds more materials',
  refinery: 'Turns ore into alloy, wire and parts',
  fuelProcessor: 'Turns water and oxygen into fuel',
  service: 'Repairs and refuels nearby',
  laser: 'Shoots down incoming rocks',
  flak: 'Bursts against swarms of rocks',
  missile: 'Long-range rock interception',
  miningRig: 'Mines a surface deposit',
  researchLab: 'Studies samples to unlock tech',
  habitatSmall: 'Breathable air for your crew',
  habitatLarge: 'Large breathable dome',
  shieldSmall: 'Absorbs impacts nearby',
  shieldLarge: 'Absorbs impacts over a wide area',
};

const PRODUCT_LABEL: Record<Product, string> = {
  alloy: 'alloy',
  wire: 'wire',
  components: 'components',
  water: 'water',
  oxygen: 'oxygen',
  fuel: 'fuel',
};

const GROUP_IDS = ['power', 'industry', 'crew', 'defence'] as const;
export type BuildGroup = typeof GROUP_IDS[number];

function round(value: number): number {
  return Number(value.toFixed(1));
}

export function missingLine(w: WorldState, kind: BuildType): string | null {
  const parts = PRODUCTS.flatMap(p => {
    const need = BLUEPRINTS[kind].cost[p] ?? 0;
    const have = availableProduct(w.colony, p);
    return have + 1e-9 < need ? [`${round(need - have)} more ${PRODUCT_LABEL[p]}`] : [];
  });
  return parts.length ? `Needs ${parts.join(', ')}` : null;
}

function card(w: WorldState, kind: BuildType): CardView {
  const index = BUILD_TYPES.indexOf(kind);
  const cost = PRODUCTS.flatMap(p => {
    const need = BLUEPRINTS[kind].cost[p] ?? 0;
    return need > 0 ? [{ product: p, need, short: availableProduct(w.colony, p) + 1e-9 < need }] : [];
  });
  const locked = (kind === 'shieldSmall' || kind === 'shieldLarge') && !w.colony.research.completed.includes('combat');
  return {
    kind,
    label: BLUEPRINTS[kind].label,
    hotkey: index >= 0 && index < 9 ? String(index + 1) : null,
    purpose: PURPOSE[kind],
    cost,
    missing: locked ? 'Needs Combat engineering research' : missingLine(w, kind),
    selected: w.colony.selected === kind,
  };
}

function blockedReason(w: WorldState): string | null {
  if (w.playerMode === 'ship' && w.ship.state === 'crashed') return 'Recover the lander first (Backspace)';
  if (w.playerMode === 'ship' && w.ship.state === 'flying') return 'Land or step out to build';
  if (w.playerMode === 'astronaut' && w.astronaut.health <= 0) return 'Your astronaut needs rescue first';
  return null;
}

function crewLine(w: WorldState): string | null {
  const root = w.rootWorld ?? w;
  const order = root.crewOrder;
  if (!order) return null;
  if (order.type === 'walk') return 'Astronaut walking';
  const job = w.colony.command.queue.find(o => !o.paused);
  if (!job) return null;
  return job.status === 'crew building' ? `Building ${BLUEPRINTS[job.kind].label}` : `Walking to ${BLUEPRINTS[job.kind].label}`;
}

function hintFor(w: WorldState, blocked: string | null): string {
  if (blocked) return blocked;
  if (w.playerMode === 'ship') return 'Click the ground to place. Step out (F) and your astronaut builds it.';
  return 'Click the ground to place. Your astronaut walks over and builds it.';
}

export function buildView(w: WorldState, group: BuildGroup = 'power'): BuildView {
  const blocked = blockedReason(w);
  const full = featureVisible('catalogue');
  const kinds = full
    ? (GROUPS[GROUP_IDS.indexOf(group)]?.[1] ?? []).filter(k => blueprintVisible(k))
    : BUILD_TYPES.filter(k => blueprintVisible(k));
  const net = w.colony.generation - w.colony.demand;
  return {
    blocked,
    where: w.playerMode === 'astronaut' ? 'foot' : 'ship',
    hint: hintFor(w, blocked),
    groups: full ? GROUP_IDS.map((id, i) => ({ id, label: GROUPS[i][0], active: id === group })) : null,
    cards: kinds.map(kind => card(w, kind)),
    resources: [
      { key: 'ore', label: 'Ore', value: `${inventoryMass(w.depot).toFixed(0)} kg`, level: 'neutral' },
      ...(['alloy', 'wire', 'components'] as const).map(p => ({
        key: p,
        label: p[0].toUpperCase() + p.slice(1),
        value: availableProduct(w.colony, p).toFixed(0),
        level: 'neutral' as const,
      })),
      {
        key: 'power',
        label: 'Power',
        value: `${net >= 0 ? '+' : '−'}${Math.abs(net).toFixed(1)} kW`,
        level: net < -1e-6 ? 'bad' : w.colony.generation > 0 ? 'good' : 'neutral',
      },
    ],
    queue: w.colony.command.queue.map(o => ({
      id: o.id,
      label: BLUEPRINTS[o.kind].label,
      fraction: Math.min(1, o.progress / CONSTRUCTION_SECONDS),
      status: o.paused ? 'paused' : o.status,
      paused: o.paused,
    })),
    crew: crewLine(w),
  };
}

/** Plain-language tip at the cursor for the current placement attempt. */
export function placementTip(w: WorldState, kind: BuildType, error: string | null): { text: string; ok: boolean } {
  const label = BLUEPRINTS[kind].label;
  if (!error) return { text: `${label} · click to place`, ok: true };
  if (error === 'Insufficient fabrication materials') return { text: missingLine(w, kind) ?? 'Not enough materials', ok: false };
  return { text: error, ok: false };
}

/** The always-visible list of queued buildings, shown while the build bar is closed. */
export interface QueueView {
  orders: OrderView[];
  /** One short line: what is happening or what to do next. */
  hint: string;
  /** The button that starts the work, when pressing it would do something. */
  start: boolean;
  /** The astronaut is already on the job. */
  working: boolean;
}

export function queueView(w: WorldState): QueueView | null {
  const orders = buildView(w).queue;
  if (orders.length === 0) return null;
  const active = orders.some(o => !o.paused);
  const root = w.rootWorld ?? w;
  const working = root.crewOrder?.type === 'build';
  const hint = working
    ? crewLine(w) ?? 'Astronaut working'
    : w.playerMode === 'ship'
      ? 'Step out (F) and your astronaut builds these.'
      : active
        ? 'Press Start to send your astronaut to build.'
        : 'All paused. Cancel them or place new sites.';
  return { orders, hint, start: !working && w.playerMode === 'astronaut' && active, working };
}
