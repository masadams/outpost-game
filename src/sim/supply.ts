import { lanesBlocked } from './events';
import { BODY_IDS, BODIES, type BodyId } from './celestial';
import { colonyWorld } from './localWorld';
import { bodyKnown } from './explorationConfig';
import { podError, podTerms, sendPod, POD } from './pods';
import { RESOURCES, type Resource } from './resources';
import type { WorldState } from './world';

/** Supply lines: keep each world stocked to its reserve by sending pods from worlds with ore to spare, on their own. */
export interface SupplyLines {
  enabled: boolean;
  /** Ore each world wants to keep in its depot (kg), by world and kind. */
  reserves: Partial<Record<BodyId, Partial<Record<Resource, number>>>>;
  /** World seconds of the last check. */
  last: number;
  /** What it did or why it did nothing, last time. */
  line: string;
}

export const SUPPLY = {
  /** Seconds between checks. */
  every: 60,
  /** Smallest top-up worth a pod (kg). */
  least: 10,
  /** Reserves move in steps of this many kg, up to a limit. */
  step: 10,
  limit: 400,
} as const;

export const createSupply = (): SupplyLines => ({ enabled: false, reserves: {}, last: 0, line: 'Off.' });

export const supplyUnlocked = (w: WorldState): boolean => (w.rootWorld ?? w).colony.research.completed.includes('podLogistics');

/** The worlds a supply line can run between: those you have found and could send from or to. */
export function supplyWorlds(w: WorldState): BodyId[] {
  const root = w.rootWorld ?? w;
  return BODY_IDS.filter(id => id === 'home' || (bodyKnown(root.exploration, id) && colonyWorld(root, id).colony.buildings.length > 0));
}

const reserveOf = (s: SupplyLines, body: BodyId, r: Resource): number => s.reserves[body]?.[r] ?? 0;

/** Kilograms of one kind already on their way to a world. */
function inFlight(w: WorldState, to: BodyId, r: Resource): number {
  return w.exploration.pods.filter(p => p.to === to).reduce((n, p) => n + p.cargo[r], 0);
}

export type SupplyAction = { type: 'supply'; op: 'toggle' } | { type: 'supplyReserve'; body: BodyId; resource: Resource; delta: number };
export const isSupplyAction = (a: { type: string }): a is SupplyAction => a.type === 'supply' || a.type === 'supplyReserve';

export function applySupplyAction(w: WorldState, a: SupplyAction): void {
  const root = w.rootWorld ?? w;
  if (!supplyUnlocked(root)) return;
  const s = (root.exploration.supply ??= createSupply());
  if (a.type === 'supply') {
    s.enabled = !s.enabled;
    s.line = s.enabled ? 'On. Checking every minute.' : 'Off.';
    s.last = root.system.time;
    return;
  }
  if (!BODY_IDS.includes(a.body) || !RESOURCES.includes(a.resource) || ![-SUPPLY.step, SUPPLY.step].includes(a.delta)) return;
  const row = (s.reserves[a.body] ??= {});
  row[a.resource] = Math.max(0, Math.min(SUPPLY.limit, (row[a.resource] ?? 0) + a.delta));
}

/** One check: top up the world furthest below its reserve, from the world with the most to spare. */
export function stepSupply(w: WorldState): void {
  const s = w.exploration.supply;
  if (!s || !s.enabled || w.system.time < s.last + SUPPLY.every) return;
  s.last = w.system.time;
  if (lanesBlocked(w)) {
    s.line = 'A debris field is crossing the lanes.';
    return;
  }
  if (w.exploration.pods.length >= POD.max) {
    s.line = 'All pods are out.';
    return;
  }
  const worlds = supplyWorlds(w);
  let best: { to: BodyId; r: Resource; need: number } | null = null;
  for (const to of worlds) {
    const depot = colonyWorld(w, to).depot;
    for (const r of RESOURCES) {
      const want = reserveOf(s, to, r);
      if (want <= 0) continue;
      const need = want - depot[r] - inFlight(w, to, r);
      if (need >= SUPPLY.least && (!best || need > best.need)) best = { to, r, need };
    }
  }
  if (!best) {
    s.line = 'Every world has its reserve.';
    return;
  }
  let source: { from: BodyId; spare: number } | null = null;
  for (const from of worlds) {
    if (from === best.to) continue;
    const spare = colonyWorld(w, from).depot[best.r] - reserveOf(s, from, best.r);
    if (spare >= SUPPLY.least && (!source || spare > source.spare)) source = { from, spare };
  }
  const label = `${best.r === 'rareMetals' ? 'rare metals' : best.r} for ${BODIES[best.to].label}`;
  if (!source) {
    s.line = `${BODIES[best.to].label} needs ${Math.round(best.need)} kg of ${best.r === 'rareMetals' ? 'rare metals' : best.r}, and no world has any to spare.`;
    return;
  }
  const capacity = podTerms(colonyWorld(w, source.from)).capacity;
  const kg = Math.floor(Math.min(best.need, source.spare, capacity));
  const manifest = { [best.r]: kg } as Partial<Record<Resource, number>>;
  const blocked = podError(w, source.from, best.to, manifest);
  if (blocked) {
    s.line = `Could not send ${label}: ${blocked}`;
    return;
  }
  sendPod(w, source.from, best.to, manifest);
  s.line = `Sent ${kg} kg of ${label} from ${BODIES[source.from].label}.`;
}
