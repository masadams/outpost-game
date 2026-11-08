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
  /** The report from the last one home, kept until the next one leaves. */
  report: ExpeditionReport | null;
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
    report: null,
  };
  notify(root, `EXPEDITION LEFT FOR ${echo.name.toUpperCase()} · BACK IN ABOUT ${Math.round(seconds / 60)} MIN`);
}

/** The first technology that is open by prerequisites alone and not yet researched. */
function openTech(w: WorldState): TechId | null {
  const done = w.colony.research.completed;
  return TECH_IDS.find(id => !done.includes(id) && !isFindTech(id) && TECHNOLOGIES[id].requires.every(r => done.includes(r))) ?? null;
}

function resolve(w: WorldState, e: Expedition): ExpeditionReport {
  const echo = w.exploration.signal!.echo!;
  const rand = streamFor(w.seed, `expedition/${e.count}`);
  const risk = legRisk(echo.hazard, e.kit);
  let trouble = 0;
  const lines: string[] = [];
  const legs = ['past the edge of the system', 'through the long dark', `into the ${echo.name} system`];
  for (let i = 0; i < EXPEDITION.legs; i++) {
    if (rand() < risk) {
      trouble++;
      lines.push(`Trouble ${legs[i]}: ${echo.hazard}.`);
    } else {
      lines.push(`Clear ${legs[i]}.`);
    }
  }
  if (trouble >= EXPEDITION.legs) {
    lines.push('The craft did not come home.');
    return { result: 'lost', lines };
  }
  const share = [1, 0.5, 0.25][trouble];
  const result: ExpeditionReport['result'] = trouble === 0 ? 'full' : trouble === 1 ? 'partial' : 'thin';
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

/** Brings the expedition home when its time is up. */
export function stepExpedition(w: WorldState): void {
  const e = w.exploration.expedition;
  if (!e || e.phase !== 'out' || w.system.time < e.returnsAt) return;
  e.phase = 'back';
  e.report = resolve(w, e);
  notify(w, e.report.result === 'lost' ? 'THE EXPEDITION IS OVERDUE · NO WORD' : 'THE EXPEDITION IS HOME · SEE BASE FOR THE REPORT');
}

export type ExpeditionAction = { type: 'launchExpedition'; kit: ExpeditionKit };
export const isExpeditionAction = (a: { type: string }): a is ExpeditionAction => a.type === 'launchExpedition';
