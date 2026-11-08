import { streamFor } from './seed';
import { notify } from './messages';
import { PRODUCTS, type ProductInventory } from './colonyConfig';
import { availableProduct } from './colonyPolicy';
import { watchBoost } from './airMachines';
import type { WorldState } from './world';

/** What a beacon heard, far out: a star system worth the long voyage. Seeded, so a save always hears the same one. */
export interface SystemEcho {
  name: string;
  star: string;
  worlds: number;
  hazard: string;
  /** Direction on the chart, radians. */
  bearing: number;
  /** Distance in light-hours. */
  lightHours: number;
}

/** The one-way beacon: sent, then heard from after a long wait. */
export interface DeepSignal {
  phase: 'sent' | 'heard';
  sentAt: number;
  hearAt: number;
  echo: SystemEcho | null;
  /** Which worlds of the far system an expedition has been past. */
  surveyed?: number[];
}

export const SIGNAL = {
  cost: { fuel: 30, alloy: 12, wire: 4, components: 6 } as Partial<ProductInventory>,
  /** Seconds of waiting at the shortest and the longest, before antennas and optics help. */
  minimum: 3600,
  spread: 7200,
  /** Antennas and Survey optics shorten the wait, never below this share of it. */
  floor: 0.6,
} as const;

const SYLLABLES = ['ka', 'ra', 'vel', 'or', 'tha', 'min', 'sel', 'dun', 'ixa', 'lor', 'pel', 'ven'];
const STARS = ['red dwarf', 'orange dwarf', 'yellow star', 'blue-white star', 'binary pair'];
const HAZARDS = ['quiet', 'flare star', 'dense debris belt', 'strong radiation', 'tidal storms'];

export function echoFor(seed: number): SystemEcho {
  const rand = streamFor(seed, 'signal/echo');
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(rand() * list.length)];
  const name = pick(SYLLABLES) + pick(SYLLABLES) + pick(SYLLABLES);
  return {
    name: name[0].toUpperCase() + name.slice(1),
    star: pick(STARS),
    worlds: 2 + Math.floor(rand() * 6),
    hazard: pick(HAZARDS),
    bearing: rand() * Math.PI * 2 - Math.PI,
    lightHours: Math.round((3 + rand() * 37) * 10) / 10,
  };
}

/** How long the wait is for this save, given the antennas running now. */
export function signalWait(w: WorldState): number {
  const base = SIGNAL.minimum + streamFor(w.seed, 'signal/delay')() * SIGNAL.spread;
  return base * Math.max(SIGNAL.floor, 1 / watchBoost(w));
}

/** Why a beacon cannot go now, or null. */
export function signalError(w: WorldState): string | null {
  const root = w.rootWorld ?? w;
  if (!root.colony.research.completed.includes('deepSignal')) return 'Research Deep signal first.';
  if (root.exploration.signal) return root.exploration.signal.phase === 'sent' ? 'A beacon is already out there.' : 'You have already heard back.';
  if (!root.colony.buildings.some(b => b.kind === 'observatory' && b.status === 'running')) return 'Needs a running Observatory.';
  if (!root.colony.buildings.some(b => b.kind === 'antenna' && b.status === 'running')) return 'Needs a running Comms antenna.';
  const short = PRODUCTS.filter(p => availableProduct(root.colony, p) + 1e-9 < (SIGNAL.cost[p] ?? 0));
  if (short.length > 0) return `Needs ${short.map(p => `${SIGNAL.cost[p]} ${p} (you have ${Math.floor(availableProduct(root.colony, p))})`).join(', ')}.`;
  return null;
}

export function launchBeacon(w: WorldState): void {
  const root = w.rootWorld ?? w;
  const error = signalError(root);
  if (error) {
    notify(root, error);
    return;
  }
  for (const p of PRODUCTS) root.colony.products[p] -= SIGNAL.cost[p] ?? 0;
  const sentAt = root.system.time;
  root.exploration.signal = { phase: 'sent', sentAt, hearAt: sentAt + signalWait(root), echo: null };
  notify(root, 'BEACON LAUNCHED · ONE WAY · LISTEN FOR AN ECHO');
}

/** Hears back once the wait is over. */
export function stepSignal(w: WorldState): void {
  const signal = w.exploration.signal;
  if (!signal || signal.phase !== 'sent' || w.system.time < signal.hearAt) return;
  signal.phase = 'heard';
  signal.echo = echoFor(w.seed);
  notify(w, `A SIGNAL CAME BACK · ${signal.echo.name.toUpperCase()}, ${signal.echo.lightHours} LIGHT-HOURS OUT · SEE THE MAP`);
}

export type SignalAction = { type: 'launchBeacon' };
export const isSignalAction = (a: { type: string }): a is SignalAction => a.type === 'launchBeacon';
