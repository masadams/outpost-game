import { streamFor } from './seed';
import { notify } from './messages';
import { PRODUCTS, type ProductInventory } from './colonyConfig';
import { availableProduct } from './colonyPolicy';
import { oreCapacity } from './colony';
import { inventoryMass } from './resources';
import { TECHNOLOGIES, TECH_IDS, type TechId } from './progressionConfig';
import { isFindTech } from './finds';
import type { WorldState } from './world';

/** What the player chooses to pack. Each helps against the trip's dangers and costs materials. */
export interface ExpeditionKit {
  fuel: boolean;
  shielding: boolean;
  stores: boolean;
}

export interface ExpeditionReport {
  /** How it went, in a word: full, partial, thin or lost. */
  result: 'full' | 'partial' | 'thin' | 'lost';
  lines: string[];
}

/** A craft sent to the far system and back. One at a time. */
export interface Expedition {
  /** How many have been sent, so each one rolls its own dice. */
  count: number;
  phase: 'out' | 'back';
  launchedAt: number;
  returnsAt: number;
  kit: ExpeditionKit;
  /** Packs already spent answering trouble. */
  used: ExpeditionKit;
  /** Which of the three legs comes next (3 once all are past). */
  leg: number;
  /** Trouble that got the better of the craft so far. */
  setbacks: number;
  /** Trouble waiting for a decision, if any, and when the craft decides for itself. */
  pending: { leg: number; deadline: number } | null;
  /** What has happened so far, one line a leg. */
  log: string[];
  /** The report from the last one home, kept until the next one leaves. */
  report: ExpeditionReport | null;
}

/** One way to answer trouble. */
export interface ExpeditionChoice {
  key: 'push' | 'wait' | 'shields' | 'burn' | 'stores';
  label: string;
  detail: string;
  /** True when it is certain to work. */
  safe: boolean;
}

export const EXPEDITION = {
  /** The craft itself, always. */
  craft: { alloy: 30, wire: 14, components: 14 } as Partial<ProductInventory>,
  packs: {
    fuel: { label: 'Long-range fuel', cost: { fuel: 60 } as Partial<ProductInventory> },
    shielding: { label: 'Radiation shielding', cost: { alloy: 24, components: 6 } as Partial<ProductInventory> },
    stores: { label: 'Supply stores', cost: { water: 20, oxygen: 10 } as Partial<ProductInventory> },
  },
  /** Seconds out and back: a fixed part plus more for a farther system. */
  seconds: 1200,
  perLightHour: 45,
  /** Dangers on the way. */
  legs: 3,
  /** Chance of trouble on each leg, by the hazard the beacon heard of. */
  risk: { quiet: 0.15, 'flare star': 0.35, 'dense debris belt': 0.35, 'strong radiation': 0.4, 'tidal storms': 0.35 } as Record<string, number>,
  /** Ore brought home from a full run, kg. */
  haul: 140,
} as const;

export const noKit = (): ExpeditionKit => ({ fuel: false, shielding: false, stores: false });

const SHIELDED = ['flare star', 'strong radiation', 'dense debris belt', 'tidal storms'];

/** Trouble chance on each leg with this kit. */
export function legRisk(hazard: string, kit: ExpeditionKit): number {
  const base = EXPEDITION.risk[hazard] ?? 0.3;
  const cut = (kit.fuel ? 0.08 : 0) + (kit.stores ? 0.08 : 0) + (kit.shielding && SHIELDED.includes(hazard) ? 0.18 : 0);
  return Math.max(0.03, base - cut);
}

/** The whole bill for a kit, as materials. */
export function expeditionCost(kit: ExpeditionKit): Partial<ProductInventory> {
  const total: Partial<ProductInventory> = { ...EXPEDITION.craft };
  for (const key of ['fuel', 'shielding', 'stores'] as const) {
    if (!kit[key]) continue;
    for (const p of PRODUCTS) total[p] = (total[p] ?? 0) + (EXPEDITION.packs[key].cost[p] ?? 0);
  }
  return total;
}

/** A plain read on the odds, from the chance of getting through every leg. */
export function oddsWord(hazard: string, kit: ExpeditionKit): string {
  const clear = (1 - legRisk(hazard, kit)) ** EXPEDITION.legs;
  return clear > 0.7 ? 'Good odds' : clear > 0.5 ? 'Fair odds' : clear > 0.3 ? 'Risky' : 'Very risky';
}

export function expeditionError(w: WorldState, kit: ExpeditionKit): string | null {
  const root = w.rootWorld ?? w;
  const signal = root.exploration.signal;
  if (!signal || signal.phase !== 'heard') return 'Wait for the beacon to hear back first.';
  if (root.exploration.expedition && root.exploration.expedition.phase !== 'back') return 'An expedition is already out.';
  const cost = expeditionCost(kit);
  const short = PRODUCTS.filter(p => availableProduct(root.colony, p) + 1e-9 < (cost[p] ?? 0));
  if (short.length > 0) return `Needs ${short.map(p => `${cost[p]} ${p} (you have ${Math.floor(availableProduct(root.colony, p))})`).join(', ')}.`;
  return null;
}

export function launchExpedition(w: WorldState, kit: ExpeditionKit): void {
  const root = w.rootWorld ?? w;
  const error = expeditionError(root, kit);
  if (error) {
    notify(root, error);
    return;
  }
  const cost = expeditionCost(kit);
  for (const p of PRODUCTS) root.colony.products[p] -= cost[p] ?? 0;
  const echo = root.exploration.signal!.echo!;
  const seconds = EXPEDITION.seconds + echo.lightHours * EXPEDITION.perLightHour;
  const before = root.exploration.expedition;
  root.exploration.expedition = {
    count: (before?.count ?? 0) + 1,
    phase: 'out',
    launchedAt: root.system.time,
    returnsAt: root.system.time + seconds,
    kit: { ...kit },
    used: noKit(),
    leg: 0,
    setbacks: 0,
    pending: null,
    log: [],
    report: null,
  };
  notify(root, `EXPEDITION LEFT FOR ${echo.name.toUpperCase()} · BACK IN ABOUT ${Math.round(seconds / 60)} MIN`);
}

/** The first technology that is open by prerequisites alone and not yet researched. */
function openTech(w: WorldState): TechId | null {
  const done = w.colony.research.completed;
  return TECH_IDS.find(id => !done.includes(id) && !isFindTech(id) && TECHNOLOGIES[id].requires.every(r => done.includes(r))) ?? null;
}

const LEGS = ['past the edge of the system', 'through the long dark', 'into the far system'];

/** Seconds the craft waits for an answer before it picks the cautious-but-slow way itself. */
export const DECISION_SECONDS = 300;
const WAIT_EXTRA = 300;

/** How to answer the trouble on the next leg, given what is packed and what is already spent. */
export function expeditionChoices(w: WorldState): ExpeditionChoice[] {
  const e = w.exploration.expedition;
  const echo = w.exploration.signal?.echo;
  if (!e || !echo) return [];
  const have = (k: keyof ExpeditionKit): boolean => e.kit[k] && !e.used[k];
  const list: ExpeditionChoice[] = [
    { key: 'push', label: 'Push on', detail: 'No cost. About a coin flip.', safe: false },
    { key: 'wait', label: 'Hold and wait it out', detail: `Costs ${WAIT_EXTRA / 60} more minutes. Usually works.`, safe: false },
  ];
  if (have('shielding') && SHIELDED.includes(echo.hazard)) list.push({ key: 'shields', label: 'Shields up', detail: 'Uses the shielding. Certain to work.', safe: true });
  if (have('fuel')) list.push({ key: 'burn', label: 'Burn clear of it', detail: 'Uses the long-range fuel. Certain to work.', safe: true });
  if (have('stores')) list.push({ key: 'stores', label: 'Ride it out on stores', detail: 'Uses the supplies. Certain to work.', safe: true });
  return list;
}

function setback(e: Expedition, text: string): void {
  e.setbacks++;
  e.log.push(text);
}

function answer(w: WorldState, e: Expedition, key: ExpeditionChoice['key']): void {
  const echo = w.exploration.signal!.echo!;
  const leg = e.pending!.leg;
  const place = LEGS[leg];
  const roll = streamFor(w.seed, `expedition/${e.count}/${leg}/${key}`)();
  e.pending = null;
  e.leg = leg + 1;
  if (key === 'shields') {
    e.used.shielding = true;
    e.log.push(`Trouble ${place} (${echo.hazard}): shields held.`);
  } else if (key === 'burn') {
    e.used.fuel = true;
    e.log.push(`Trouble ${place} (${echo.hazard}): burned clear of it.`);
  } else if (key === 'stores') {
    e.used.stores = true;
    e.log.push(`Trouble ${place} (${echo.hazard}): rode it out on the stores.`);
  } else if (key === 'wait') {
    e.returnsAt += WAIT_EXTRA;
    if (roll < 0.85) e.log.push(`Trouble ${place} (${echo.hazard}): held and waited, and it passed.`);
    else setback(e, `Trouble ${place} (${echo.hazard}): waited, but it did damage.`);
  } else if (roll < 0.5) {
    e.log.push(`Trouble ${place} (${echo.hazard}): pushed on and got through.`);
  } else {
    setback(e, `Trouble ${place} (${echo.hazard}): pushed on and paid for it.`);
  }
}

function finish(w: WorldState, e: Expedition): ExpeditionReport {
  const lines = [...e.log];
  if (e.setbacks >= EXPEDITION.legs) {
    lines.push('The craft did not come home.');
    return { result: 'lost', lines };
  }
  const share = [1, 0.5, 0.25][e.setbacks];
  const result: ExpeditionReport['result'] = e.setbacks === 0 ? 'full' : e.setbacks === 1 ? 'partial' : 'thin';
  const kg = Math.round(EXPEDITION.haul * share);
  const room = Math.max(0, oreCapacity(w.colony) - inventoryMass(w.depot));
  const put = Math.min(kg, room);
  w.depot.rareMetals += put * 0.4;
  w.depot.silicon += put * 0.6;
  lines.push(`Brought home ${Math.round(put)} kg of rare metals and silicon${put < kg ? ' (the rest did not fit)' : ''}.`);
  if (result !== 'thin') {
    const tech = openTech(w);
    if (tech) {
      w.colony.research.completed.push(tech);
      lines.push(`Survey data completed ${TECHNOLOGIES[tech].label}.`);
    }
  }
  return { result, lines };
}

/** Moves the expedition on: trouble arrives at each leg, waits for a decision, then it comes home. */
export function stepExpedition(w: WorldState): void {
  const e = w.exploration.expedition;
  if (!e || e.phase !== 'out') return;
  const echo = w.exploration.signal?.echo;
  if (!echo) return;
  const time = w.system.time;
  if (e.pending) {
    if (time >= e.pending.deadline) answer(w, e, 'wait');
    return;
  }
  const span = e.returnsAt - e.launchedAt;
  while (e.leg < EXPEDITION.legs && !e.pending && time >= e.launchedAt + (span * (e.leg + 1)) / (EXPEDITION.legs + 1)) {
    const trouble = streamFor(w.seed, `expedition/${e.count}/${e.leg}`)() < legRisk(echo.hazard, e.kit);
    if (trouble) {
      e.pending = { leg: e.leg, deadline: time + DECISION_SECONDS };
      notify(w, `EXPEDITION IN TROUBLE ${LEGS[e.leg].toUpperCase()} · DECIDE IN BASE`);
    } else {
      e.log.push(`Clear ${LEGS[e.leg]}.`);
      e.leg++;
    }
  }
  if (e.pending || e.leg < EXPEDITION.legs || time < e.returnsAt) return;
  e.phase = 'back';
  e.report = finish(w, e);
  notify(w, e.report.result === 'lost' ? 'THE EXPEDITION IS OVERDUE · NO WORD' : 'THE EXPEDITION IS HOME · SEE BASE FOR THE REPORT');
}

/** Answers the trouble that is waiting, if the choice is one that is offered. */
export function chooseExpedition(w: WorldState, key: string): void {
  const root = w.rootWorld ?? w;
  const e = root.exploration.expedition;
  if (!e || !e.pending) {
    notify(root, 'Nothing needs deciding.');
    return;
  }
  if (!expeditionChoices(root).some(c => c.key === key)) {
    notify(root, 'That is not an option now.');
    return;
  }
  answer(root, e, key as ExpeditionChoice['key']);
}

export type ExpeditionAction = { type: 'launchExpedition'; kit: ExpeditionKit } | { type: 'expeditionChoice'; choice: string };
export const isExpeditionAction = (a: { type: string }): a is ExpeditionAction => a.type === 'launchExpedition' || a.type === 'expeditionChoice';
