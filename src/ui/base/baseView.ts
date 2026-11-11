import { pileMass } from '../../sim/stockpile';
import { buildingLimit, centreName, headquarters, hqLevel, hqUpgradeBlock, levelsFor, type HqLevel } from '../../sim/headquarters';
import { gridsView, type GridsView } from './gridsView';
import {
  ENDING_IDS, ENDINGS, SEED_SHIP, SEED_STAGES, costLine, hasShipyard, seedEnding, seedShipComplete, seedStageBlock,
  seedStagesDone, type EndingId, type SeedStage,
} from '../../sim/seedShip';
import { hasMemory } from '../../sim/story';
import { KEYSTONE_WORLDS, KEYSTONES, keystoneCount, keystonesOpen, keystoneState } from '../../sim/keystones';
import { WORLD } from '../../sim/config';
import { turretRange } from '../../sim/weapons';
import { RELAY_CAPACITY, islandGroups } from '../../sim/grid';
import { BATTERY_CAPACITY } from '../../sim/colony';
import { featureVisible } from '../../preferences/features';
import { createSchedule, SCHEDULE_PRODUCTS, type ScheduleProduct } from '../../sim/scheduling';
import { generatorOutput, isGenerator } from '../../sim/generators';
import { surfaceAir } from '../../sim/airMachines';
import { upgradeView, type UpgradeView } from './upgradeView';
import { capacityFactor, facilityLevel } from '../../sim/facilityStats';
import { researchView, type ResearchRow } from './researchView';
import { researchTreeView, type ResearchTreeView } from './researchTreeView';
import { coreBlock, crystalBlock } from '../../sim/crystal';
import { isTurret, WEAPONS } from '../../sim/defenceConfig';
import { BLUEPRINTS, PRODUCTS, type BuildType, type Product } from '../../sim/colonyConfig';
import { demolishError, demolishLoss, energyCapacity, oreCapacity, productCapacity, recipeFor, salvageOf, type Building } from '../../sim/colony';
import { buildingHealth } from '../../sim/buildingHealth';
import { ratedPower } from '../../sim/power';
import { colonyPlanet, colonyWorld } from '../../sim/localWorld';
import { podError } from '../../sim/pods';
import { signalError } from '../../sim/signal';
import { supplyUnlocked, supplyWorlds } from '../../sim/supply';
import { EXPEDITION, LEGS, expeditionChoices, expeditionCost, expeditionError, oddsWord } from '../../sim/expedition';
import { farWorlds, kindWord } from '../../sim/farWorlds';
import { inventoryMass } from '../../sim/resources';
import { BODIES, BODY_IDS, type BodyId } from '../../sim/celestial';
import { bodyKnown } from '../../sim/explorationConfig';
import { RESOURCES, RESOURCE_INFO } from '../../sim/resources';
import { cargoMass } from '../../sim/shipMass';
import { cargoCapacity, fuelCapacity } from '../../sim/shipStats';
import { ANALYSIS_ENERGY } from '../../sim/stormConfig';
import { policyFor } from '../../sim/colonyPolicy';
import { SUN, sunClock } from '../../sim/sun';
import { duration } from '../flight/stormView';
import type { WorldState } from '../../sim/world';

/** Everything the Base window shows, derived from the simulation. Pure: no DOM, no Phaser. */
export interface BaseView {
  name: string;
  stocks: StockView[];
  storage: { ore: string; products: string };
  power: PowerView;
  attention: AttentionView[];
  buildings: BuildingView[];
  ship: ShipView;
  /** Present once a storm has been seen: pieces to collect and what analysing them gives. */
  storm: StormLabView | null;
  crystal: CrystalLabView | null;
  core: CrystalLabView | null;
  research: ResearchRow[] | null;
  /** The full research tree and ship parts. Null until a first find has been studied. */
  tree: ResearchTreeView | null;
  /** The other worlds with a base, so a mine far away can be checked without going there. */
  elsewhere: OutpostView[];
  /** Carrier parts: how many are home and where the rest are. Null until the unit knows to look. */
  carrier: CarrierView | null;
  /** The Headquarters: its level, the room left, and the next upgrade. Null at a base without one. */
  hq: HqView | null;
  /** Every power grid at this base. Null where the whole base is one grid (no day cycle). */
  grids: GridsView | null;
  /** The seed ship project. Null until a Shipyard can be built. */
  seedShip: SeedShipView | null;
  /** Cargo pods: where this base can send ore, and what is on its way. Null when there is nothing to show. */
  pods: PodsView | null;
  /** The deep-space beacon: how to send it, how long is left, what came back. Null until it is researched. */
  signal: SignalView | null;
  /** Automatic supply lines between worlds. Null until Pod logistics is researched and there are two worlds. */
  supply: SupplyView | null;
}

export interface SupplyView {
  enabled: boolean;
  line: string;
  worlds: Array<{ body: string; label: string; cells: Array<{ resource: string; label: string; reserve: number; have: number }> }>;
}

export interface SignalView {
  state: 'ready' | 'waiting' | 'heard';
  line: string;
  /** Why it cannot be sent now, or null. */
  reason: string | null;
  echo: { name: string; lines: string[] } | null;
  /** Sending a craft to the far system and back. Present once the echo is in. */
  expedition: ExpeditionView | null;
}

export interface ExpeditionView {
  state: 'plan' | 'out' | 'trouble';
  line: string;
  /** What is going wrong and how it can be answered, while the craft waits. */
  trouble: { title: string; minutes: number; choices: Array<{ key: string; label: string; detail: string; safe: boolean }> } | null;
  /** What has happened so far on the way. */
  log: string[];
  packs: Array<{ key: 'fuel' | 'shielding' | 'stores'; label: string; cost: string }>;
  /** The worlds of the far system: what is known of each, and whether you can land on it. */
  worlds: Array<{ index: number; name: string; line: string; landable: boolean }>;
  /** For each choice of packs (keys joined with +, or none) and where to (survey or a world number), what it costs, the odds and why it cannot go. */
  plans: Record<string, { cost: string; odds: string; reason: string | null }>;
  /** What the last expedition brought back. */
  report: { result: string; lines: string[] } | null;
}

export interface PodsView {
  sends: Array<{ to: string; label: string; reason: string | null }>;
  flying: string[];
}

export interface OutpostView {
  id: string;
  label: string;
  power: string;
  level: 'good' | 'warn' | 'bad' | 'none';
  stores: string;
  machines: Array<{ label: string; chip: Chip; line: string }>;
  /** Things that need attention there, in plain words. */
  short: string[];
}

export interface CrystalLabView {
  studied: boolean;
  line: string;
  blocked: string | null;
}

export interface StormLabView {
  /** Pieces still lying on the ground, and pieces you are carrying. */
  onGround: number;
  held: number;
  analysed: boolean;
  /** One plain line about what to do next. */
  line: string;
  /** Why the Analyse button is off, or null when it works. */
  blocked: string | null;
}

export interface StockView {
  key: string;
  label: string;
  value: string;
  group: 'ore' | 'product';
}

export interface PowerView {
  generating: number;
  using: number;
  stored: number;
  capacity: number;
  /** Plain summary, e.g. "Using 6.0 of 8.0 kW". */
  summary: string;
  level: 'good' | 'warn' | 'bad' | 'none';
  /** Only with the day and night cycle on: when the light changes and whether storage covers the dark. */
  forecast: string | null;
  /** Power kept back for the turrets: other machines stop before they eat into it. */
  reserve: number;
  /** Groups of buildings running on their own grid, away from the pad. */
  islands: string | null;
  /** Shown once there is a turret: how many shots the stored power covers. */
  defence: string | null;
}

export type Chip = 'running' | 'idle' | 'stopped' | 'off' | 'wrecked';

export interface BuildingView {
  id: number;
  kind: BuildType;
  /** Metres east (+) or west (-) of the pad, for sorting by where it stands. */
  position: number;
  /** Rated power use (kW, 0 for generators and passive buildings), for sorting. */
  power: number;
  label: string;
  chip: Chip;
  chipLabel: string;
  /** One plain line: what it is doing, or why it is not. */
  line: string;
  /** Present when something needs the player. */
  why: string | null;
  facts: Array<[string, string]>;
  canToggle: boolean;
  enabled: boolean;
  canCycleRecipe: boolean;
  /** Refineries only: whether the machine picks its own recipe. */
  autoRecipe: boolean | null;
  /** Refineries with automatic recipes: the stock each product is kept topped up to (kg). */
  targets: Array<{ product: ScheduleProduct; value: number }> | null;
  /** Present for turrets: whether they fire on their own. */
  turret: { auto: boolean; aim: number } | null;
  /** The first in-place upgrade, or null once done. */
  upgrade: UpgradeView | null;
  /** What demolishing gives back, in words, e.g. "3 alloy, 1 wire". */
  salvage: string;
  /** Why it cannot be demolished right now, or null. */
  demolishBlocked: string | null;
  /** What would be lost for lack of storage if it came down; a warning, not a block. */
  demolishWarning: string | null;
}

export interface AttentionView {
  id: number;
  text: string;
}

export interface ShipView {
  fuel: string;
  fuelFraction: number;
  hull: string;
  hullFraction: number;
  cargo: string;
  cargoFraction: number;
  where: string;
  hint: string;
}

const STATUS: Record<string, { chip: Chip; label: string }> = {
  running: { chip: 'running', label: 'Running' },
  'power limited': { chip: 'running', label: 'Running slowly' },
  'research staffed': { chip: 'running', label: 'Running' },
  idle: { chip: 'idle', label: 'Idle' },
  'target met': { chip: 'idle', label: 'Target met' },
  starting: { chip: 'running', label: 'Starting up' },
  'no power': { chip: 'stopped', label: 'No power' },
  'no feedstock': { chip: 'stopped', label: 'No input' },
  'output full': { chip: 'stopped', label: 'Storage full' },
  'no deposit': { chip: 'stopped', label: 'No deposit' },
  depleted: { chip: 'stopped', label: 'Used up' },
  'no fuel': { chip: 'stopped', label: 'No fuel' },
  'worn out': { chip: 'stopped', label: 'Worn out' },
  'power reserved': { chip: 'stopped', label: 'Power held back' },
  'delivery reserved': { chip: 'stopped', label: 'Room held back' },
  disabled: { chip: 'off', label: 'Off' },
  wrecked: { chip: 'wrecked', label: 'Wrecked' },
};

function inputNeed(b: Building): string {
  if (b.kind === 'fuelProcessor') return 'water and oxygen';
  if (b.kind === 'refinery') {
    const recipe = recipeFor(b);
    const raw = recipe ? Object.keys(recipe.raw) : [];
    return raw.length ? raw.join(' and ') + ' ore' : 'ore';
  }
  return 'input';
}

/** Why a building is not doing its job, in plain words, or null when nothing is wrong. */
export function whyStopped(b: Building): string | null {
  if (b.linked === false && b.island) {
    return b.status === 'no power' || b.status === 'power limited'
      ? 'Its own small grid is out of power. Add solar or a battery there, or a relay to the base.'
      : null;
  }
  if (b.linked === false) return 'Not connected to the base. Build a power relay between it and the pad.';
  switch (b.status) {
    case 'no power':
      return isTurret(b.kind)
        ? 'Out of power: it cannot fire. Turn off the Observatory or refinery, or set Keep for turrets in Base.'
        : 'Not enough power. Build another solar array, or a battery for the dark.';
    case 'starting':
      return 'Starting up. It needs steady power for a few seconds before it runs.';
    case 'power limited':
      return 'Running slowly because power is short.';
    case 'no feedstock':
      if (b.kind === 'condenser') return 'There is no air here to draw from. It works on Selene and on thin-air worlds.';
      return `Needs ${inputNeed(b)}. Mine some and unload it at the pad.`;
    case 'output full':
      return 'Storage is full. Build Storage, or use some materials.';
    case 'wrecked':
      return 'Wrecked. Walk up to it and repair it (U).';
    case 'depleted':
      return 'The deposit under it is used up.';
    case 'no deposit':
      return b.kind === 'droneBay' ? 'No ore seam within 300 m. Build it closer to one.' : 'It is not on a surface deposit.';
    case 'no fuel':
      return 'The drone needs fuel (0.4 per trip). Make some in a fuel processor.';
    case 'worn out':
      return 'The drone is worn out. Walk up to the bay and repair it (U).';
    case 'power reserved':
      return 'Waiting: power is being kept for the turrets (Keep for turrets in Base).';
    case 'delivery reserved':
      return 'Storage room is being held back for deliveries.';
    default:
      return null;
  }
}

export function buildingView(b: Building, w?: WorldState): BuildingView {
  const health = buildingHealth(b);
  // Solar, batteries and storage have no work cycle: they either work or are switched off / wrecked.
  const generates = isGenerator(b.kind);
  const noAir = b.kind === 'windTurbine' && w !== undefined && surfaceAir(w) === 0;
  const passive = generates || b.kind === 'battery' || b.kind === 'storage';
  const status =
    noAir && health > 0
      ? { chip: 'stopped' as const, label: 'No air' }
      : passive && health > 0 && (b.enabled || !generates)
      ? { chip: 'running' as const, label: generates ? 'Generating' : 'Ready' }
      : (STATUS[b.status] ?? { chip: b.status === 'running' ? 'running' : 'idle', label: b.status });
  const recipe = recipeFor(b);
  const power = ratedPower(b);
  const facts: Array<[string, string]> = [];
  if (recipe) facts.push(['Making', recipe.label], ['Batch time', `${recipe.seconds} s`]);
  if (power) facts.push([b.kind === 'solar' ? 'Output' : 'Power', `${power.toFixed(1)} kW`]);
  if (w && (b.kind === 'geothermal' || b.kind === 'windTurbine')) facts.push(['Output', `${generatorOutput(w, b).toFixed(1)} kW`]);
  if (isTurret(b.kind)) {
    const weapon = WEAPONS[b.kind];
    facts.push(['Range', `${Math.round(turretRange(b))} m`], ['Per shot', `${weapon.energy} kJ`]);
  }
  if (b.island) facts.push(['Grid', 'Its own small grid, away from the pad']);
  if (b.feed !== undefined && b.feed < 0.995) facts.push(['Power reaching it', `${Math.round(b.feed * 100)}% (relay line)`]);
  if (b.kind === 'battery' && b.charge !== undefined) facts.push(['Holding', `${Math.round(b.charge)} kJ of its own`]);
  if (b.kind === 'relay') facts.push(['Carrying', `${(b.gridPower ?? 0).toFixed(1)} of ${RELAY_CAPACITY * capacityFactor(b)} kW`]);
  if (b.kind === 'solar' && (b.requestedPower ?? 0) - (b.gridPower ?? 0) > 0.05) {
    facts.push(['Lost on the way', `${((b.requestedPower ?? 0) - (b.gridPower ?? 0)).toFixed(1)} kW (relay lines and limits)`]);
  }
  if (b.kind === 'battery') facts.push(['Stores', `${BATTERY_CAPACITY * capacityFactor(b)} kJ`]);
  if (b.kind === 'storage') facts.push(['Holds', `+${200 * capacityFactor(b)} kg ore, +${100 * capacityFactor(b)} each product`]);
  if (facilityLevel(b) > 1) facts.push(['Tier', `${facilityLevel(b)}`]);
  facts.push(['Condition', `${health.toFixed(0)}%`]);
  const why = noAir ? 'There is no air here to turn it. Use solar or a geothermal tap on this world.' : whyStopped(b);
  return {
    id: b.id,
    kind: b.kind,
    position: Math.round(b.angle * (w ? colonyPlanet(w).radius : WORLD.radius)),
    power: generates || passive ? 0 : power,
    label: BLUEPRINTS[b.kind].label,
    chip: status.chip,
    chipLabel: status.label,
    line: (why ?? (recipe && status.chip === 'running' ? recipe.label : status.label)) + pileNote(b),
    why,
    facts,
    canToggle: b.kind !== 'storage' && b.kind !== 'battery' && health > 0,
    enabled: b.enabled,
    canCycleRecipe: b.kind === 'refinery' && health > 0,
    autoRecipe: b.kind === 'refinery' ? b.schedule?.enabled === true : null,
    targets: b.kind === 'refinery' && featureVisible('scheduling') ? SCHEDULE_PRODUCTS.map(product => ({ product, value: (b.schedule ?? createSchedule()).targets[product] })) : null,
    turret: isTurret(b.kind) ? { auto: !!b.turret?.automatic, aim: b.turret?.aim ?? 0 } : null,
    upgrade: w && health > 0 ? upgradeView(w, b) : null,
    salvage: salvageText(b),
    demolishBlocked: w ? demolishError(w, b) : null,
    demolishWarning: w ? demolishLoss(w, b) : null,
  };
}

function powerSummary(w: WorldState): string {
  const c = w.colony;
  const panels = c.buildings.some(b => b.kind === 'solar');
  const dark = !!w.system.sun && panels && c.generation <= 1e-6;
  if (dark) {
    // Minutes and seconds, like the day clock beside it.
    const lasts = c.demand > 0 ? ` Stored power lasts about ${duration(c.energy / c.demand)} at this load.` : '';
    return `Night: solar panels are off.${lasts}`;
  }
  if (c.generation <= 0 && c.demand <= 0) return 'No power yet. Build a solar array.';
  return `Using ${c.demand.toFixed(1)} of ${c.generation.toFixed(1)} kW`;
}

function powerForecast(w: WorldState): string | null {
  if (!w.system.sun || !w.colony.buildings.some(b => b.kind === 'solar')) return null;
  const clock = sunClock(w.system, w.colony.buildings.find(b => b.kind === 'solar')!.angle, colonyPlanet(w).id);
  const when = duration(clock.secondsToChange);
  if (!clock.day) return `Light returns in ${when}.`;
  const night = Math.round(SUN.dayLength * 0.4);
  const need = w.colony.demand * night;
  const covers = need <= 0 || w.colony.energy >= need;
  if (w.colony.demand <= 0 && w.colony.energy < 1) return `Dusk in ${when}. Nothing is stored for the dark.`;
  return covers ? `Dusk in ${when}. Your stored power covers a typical night.` : `Dusk in ${when}. A typical night needs about ${Math.ceil(need)} kJ; you have ${Math.floor(w.colony.energy)}.`;
}

function islandLine(w: WorldState): string | null {
  const groups = islandGroups(w);
  if (groups.length === 0) return null;
  const stored = groups.flat().reduce((sum, b) => sum + (b.charge ?? 0), 0);
  const many = groups.length === 1 ? 'One group of buildings runs' : `${groups.length} groups of buildings run`;
  return `${many} on its own grid away from the pad, with ${Math.round(stored)} kJ stored there. A relay to the base joins it back.`;
}

function defenceLine(w: WorldState): string | null {
  const turrets = w.colony.buildings.filter(b => isTurret(b.kind) && b.enabled && buildingHealth(b) > 0);
  if (turrets.length === 0) return null;
  const perShot = Math.min(...turrets.map(b => WEAPONS[b.kind as keyof typeof WEAPONS].energy));
  const shots = Math.floor(w.colony.energy / perShot);
  return `Turrets: stored power covers about ${shots} shots.`;
}

const costWords = (cost: Partial<Record<string, number>>): string =>
  Object.entries(cost).filter(([, n]) => (n ?? 0) > 0).map(([k, n]) => `${n} ${k}`).join(', ');

function expeditionView(w: WorldState, hazard: string): ExpeditionView {
  const e = w.exploration.expedition;
  const signal = w.exploration.signal!;
  const all = farWorlds(w.seed, signal.echo!);
  const surveyed = signal.surveyed ?? [];
  const worlds = all.map(f => ({
    index: f.index,
    name: f.name,
    line: surveyed.includes(f.index) ? `${kindWord(f)}${f.landable ? '' : '. Nothing to land on.'}` : 'Not surveyed yet.',
    landable: surveyed.includes(f.index) && f.landable,
  }));
  const packs = (['fuel', 'shielding', 'stores'] as const).map(key => ({ key, label: EXPEDITION.packs[key].label, cost: costWords(EXPEDITION.packs[key].cost) }));
  const plans: ExpeditionView['plans'] = {};
  const goals: Array<number | null> = [null, ...worlds.filter(x => x.landable).map(x => x.index)];
  for (const goal of goals) {
    for (let mask = 0; mask < 8; mask++) {
      const kit = { fuel: !!(mask & 1), shielding: !!(mask & 2), stores: !!(mask & 4) };
      const key = `${(['fuel', 'shielding', 'stores'] as const).filter(k => kit[k]).join('+')}|${goal === null ? 's' : goal}`;
      plans[key] = { cost: costWords(expeditionCost(kit)), odds: oddsWord(hazard, kit, goal === null ? null : all[goal]), reason: expeditionError(w, kit, goal) };
    }
  }
  const report = e?.report ? { result: e.report.result, lines: e.report.lines } : null;
  if (e && e.phase === 'out') {
    const left = Math.max(0, Math.round((e.returnsAt - w.system.time) / 60));
    if (e.pending) {
      const minutes = Math.max(0, Math.ceil((e.pending.deadline - w.system.time) / 60));
      const find = e.pending.kind === 'find';
      const title = find ? `A wreck ${LEGS[e.pending.leg]}.` : `Trouble ${LEGS[e.pending.leg]}: ${hazard}.`;
      const trouble = { title, minutes, choices: expeditionChoices(w) };
      return { state: 'trouble', line: find ? 'The crew found something and is waiting for you.' : 'The craft is in trouble and waiting for you.', trouble, log: e.log, packs, worlds, plans, report };
    }
    return { state: 'out', line: `An expedition is on its way. About ${left} min until it is back.`, trouble: null, log: e.log, packs, worlds, plans, report };
  }
  const line = report ? 'Home again. Send another, packed differently or to a different world.' : 'Send a craft to the far system and back. Pack for the hazard.';
  return { state: 'plan', line, trouble: null, log: [], packs, worlds, plans, report };
}

function supplyView(w: WorldState): SupplyView | null {
  const root = w.rootWorld ?? w;
  if (!supplyUnlocked(root)) return null;
  const worlds = supplyWorlds(root);
  if (worlds.length < 2) return null;
  const s = root.exploration.supply;
  return {
    enabled: s?.enabled === true,
    line: s?.line ?? 'Off.',
    worlds: worlds.map(body => ({
      body,
      label: BODIES[body].label,
      cells: RESOURCES.map(r => ({ resource: r, label: RESOURCE_INFO[r].label, reserve: s?.reserves[body]?.[r] ?? 0, have: Math.round(colonyWorld(root, body).depot[r]) })),
    })),
  };
}

function signalView(w: WorldState): SignalView | null {
  const root = w.rootWorld ?? w;
  const signal = root.exploration.signal;
  if (!signal && !root.colony.research.completed.includes('deepSignal')) return null;
  if (!signal) return { state: 'ready', line: 'Send a one-way beacon into the dark and listen for an echo. It can take an hour or more.', reason: signalError(root), echo: null, expedition: null };
  if (signal.phase === 'sent') {
    const left = Math.max(0, Math.round((signal.hearAt - root.system.time) / 60));
    return { state: 'waiting', line: `The beacon is out there. Listening… about ${left} min to go.`, reason: null, echo: null, expedition: null };
  }
  const echo = signal.echo!;
  return {
    state: 'heard',
    line: `A signal came back from the ${echo.name} system.`,
    reason: null,
    echo: { name: echo.name, lines: [`A ${echo.star}, ${echo.lightHours} light-hours out.`, `${echo.worlds} worlds. Hazard: ${echo.hazard}.`] },
    expedition: expeditionView(root, echo.hazard),
  };
}

function podsView(w: WorldState): PodsView | null {
  const root = w.rootWorld ?? w;
  const here = (w.siteBody ?? 'home') as BodyId;
  const others = BODY_IDS.filter(id => id !== here && bodyKnown(root.exploration, id));
  const flying = root.exploration.pods.map(p => `${BODIES[p.from].label} to ${BODIES[p.to].label}, ${Math.max(0, Math.round(p.arrives - root.system.time))} s, ${Math.round(inventoryMass(p.cargo))} kg`);
  if (others.length === 0 && flying.length === 0) return null;
  const sends = others.map(to => ({ to, label: `Send ore to ${BODIES[to].label}`, reason: podError(root, here, to) }));
  if (sends.every(s => s.reason !== null && /mining rig or refinery/.test(s.reason)) && flying.length === 0) return null;
  return { sends, flying };
}

function elsewhereView(w: WorldState): OutpostView[] {
  const root = w.rootWorld ?? w;
  const here = w.siteBody ?? 'home';
  const out: OutpostView[] = [];
  for (const id of BODY_IDS) {
    if (id === here || !bodyKnown(root.exploration, id)) continue;
    const site = colonyWorld(root, id);
    if (site.colony.buildings.length === 0) continue;
    const buildings = site.colony.buildings.map(b => buildingView(b, site));
    const stock = [...PRODUCTS.map(p => [PRODUCT_LABEL[p], site.colony.products[p]] as const), ...RESOURCES.map(r => [RESOURCE_INFO[r].label, site.depot[r]] as const)]
      .filter(([, n]) => n >= 0.5)
      .map(([label, n]) => `${label} ${n.toFixed(0)}`);
    const power = powerView(site);
    out.push({
      id,
      label: BODIES[id].label,
      power: power.summary.replace(/\.$/, ''),
      level: power.level,
      stores: stock.length ? stock.join(' · ') : 'Nothing stored',
      machines: buildings.filter(v => !v.why).map(v => ({ label: v.label, chip: v.chip, line: v.line })),
      short: buildings.filter(v => v.why).map(v => `${v.label}: ${v.why}`),
    });
  }
  return out;
}

function powerView(w: WorldState): PowerView {
  const c = w.colony;
  const capacity = energyCapacity(c);
  const level = c.generation <= 0 && c.demand <= 0 ? 'none' : c.demand > c.generation + 1e-6 ? (c.energy > 1 ? 'warn' : 'bad') : 'good';
  return {
    generating: c.generation,
    using: c.demand,
    stored: c.energy,
    capacity,
    summary: powerSummary(w),
    forecast: powerForecast(w),
    reserve: policyFor(w.colony).energyReserve,
    defence: defenceLine(w),
    islands: islandLine(w),
    level,
  };
}

function shipView(w: WorldState): ShipView {
  const s = w.ship;
  const cargo = cargoMass(s);
  const where = s.state === 'landed' ? 'On the pad' : s.state === 'crashed' ? 'Wrecked' : 'Flying';
  const hint =
    s.state === 'crashed'
      ? 'Press Backspace to bring the lander back for 8 alloy and 2 components.'
      : s.state === 'landed'
        ? cargo > 0 ? 'Press E to unload your cargo.' : 'Ready to launch. Press W.'
        : 'Land on the pad to unload.';
  return {
    fuel: `${((s.fuel / fuelCapacity(s)) * 100).toFixed(0)}%`,
    fuelFraction: Math.max(0, Math.min(1, s.fuel / fuelCapacity(s))),
    hull: `${s.hull.toFixed(0)}%`,
    hullFraction: Math.max(0, Math.min(1, s.hull / 100)),
    cargo: `${cargo.toFixed(0)} / ${cargoCapacity(s)} kg`,
    cargoFraction: Math.min(1, cargo / cargoCapacity(s)),
    where,
    hint,
  };
}

const PRODUCT_LABEL: Record<Product, string> = {
  alloy: 'Alloy',
  wire: 'Wire',
  components: 'Components',
  water: 'Water',
  oxygen: 'Oxygen',
  fuel: 'Fuel',
};

function salvageText(b: Building): string {
  const parts = Object.entries(salvageOf(b)).map(([product, amount]) => {
    const n = Math.round(amount as number);
    return `${n} ${product === 'components' && n === 1 ? 'component' : product}`;
  });
  return parts.length ? parts.join(', ') : 'nothing';
}

export function baseView(w: WorldState): BaseView {
  const c = w.colony;
  const buildings = c.buildings.map(b => buildingView(b, w));
  const ore = RESOURCES.map(r => ({ key: r, label: RESOURCE_INFO[r].label, value: `${w.depot[r].toFixed(0)} kg`, group: 'ore' as const }));
  const products = PRODUCTS.map(p => ({ key: p, label: PRODUCT_LABEL[p], value: c.products[p].toFixed(0), group: 'product' as const }));
  const attention = buildings.filter(b => b.why).map(b => ({ id: b.id, text: `${b.label}: ${b.why}` }));
  return {
    name: colonyPlanet(w).label,
    stocks: [...ore, ...products],
    storage: { ore: `${oreCapacity(c)} kg`, products: `${productCapacity(c)} each` },
    power: powerView(w),
    attention,
    buildings,
    ship: shipView(w),
    storm: stormLab(w),
    crystal: crystalLab(w),
    core: coreLab(w),
    research: researchView(w),
    tree: researchView(w) !== null || featureVisible('catalogue') ? researchTreeView(w) : null,
    elsewhere: elsewhereView(w),
    carrier: carrierView(w),
    hq: hqView(w),
    grids: gridsView(w),
    seedShip: seedShipView(w),
    pods: podsView(w),
    signal: signalView(w),
    supply: supplyView(w),
  };
}

function coreLab(w: WorldState): CrystalLabView | null {
  const ex = (w.rootWorld ?? w).exploration;
  if (ex.core === 'lying') return null;
  const line = ex.core === 'studied'
    ? 'Deeper mining is open to research.'
    : 'A dense core sample from Cinder. Studying it opens deeper mining research.';
  return { studied: ex.core === 'studied', line, blocked: coreBlock(w.rootWorld ?? w) };
}

function crystalLab(w: WorldState): CrystalLabView | null {
  const ex = (w.rootWorld ?? w).exploration;
  if (ex.crystal === 'lying') return null;
  const line = ex.crystal === 'studied'
    ? 'Your lander has a bigger hold.'
    : 'A crystal from Nacre. Studying it teaches a bigger hold for your lander.';
  return { studied: ex.crystal === 'studied', line, blocked: crystalBlock(w.rootWorld ?? w) };
}

function stormLab(w: WorldState): StormLabView | null {
  const s = (w.rootWorld ?? w).storm;
  if (s.phase !== 'over' && !s.analysed && s.held === 0) return null;
  const lab = w.colony.buildings.some(b => b.kind === 'observatory' && buildingHealth(b) > 0);
  let blocked: string | null = null;
  if (s.analysed) blocked = 'Already analysed.';
  else if (s.held <= 0) blocked = 'Walk over a piece on the ground first.';
  else if (!lab) blocked = 'Needs a working Observatory.';
  else if (w.colony.energy < ANALYSIS_ENERGY) blocked = `Needs ${ANALYSIS_ENERGY} kJ stored (you have ${Math.floor(w.colony.energy)}).`;
  const line = s.analysed
    ? 'Your buildings now take less damage from blasts.'
    : s.held > 0
      ? 'Analyse a piece to learn how to harden your buildings.'
      : s.samples.length > 0
        ? 'Pieces of the storm are lying on the ground. Walk over one to pick it up.'
        : 'Nothing left to collect.';
  return { onGround: s.samples.length, held: s.held, analysed: s.analysed, line, blocked };
}

export interface CarrierView {
  home: number;
  total: number;
  /** One short line per part. */
  parts: Array<{ world: string; label: string; state: 'lying' | 'carried' | 'home'; line: string }>;
}

/** What is known of the carrier's parts, once the unit knows there was one ship. */
export function carrierView(w: WorldState): CarrierView | null {
  if (!keystonesOpen(w)) return null;
  const { home, total } = keystoneCount(w);
  const parts = KEYSTONE_WORLDS.map(id => {
    const state = keystoneState(w, id);
    const world = BODIES[id].label;
    const line = state === 'home' ? 'Home' : state === 'carried' ? 'Aboard your lander' : `On ${world}`;
    return { world, label: KEYSTONES[id].label, state, line };
  });
  return { home, total, parts };
}

export interface SeedShipView {
  /** Whether home has a Shipyard yet. */
  yard: boolean;
  done: number;
  total: number;
  stages: Array<{ id: SeedStage; label: string; line: string; cost: string; done: boolean; blocked: string | null }>;
  /** Null until the ship is finished; then the choices, or what was chosen. */
  launch: { chosen: EndingId | null; choices: Array<{ id: EndingId; label: string; line: string }>; epilogue: string[] } | null;
}

/** The seed ship, once the Shipyard blueprint has come back or a yard already stands. */
export function seedShipView(w: WorldState): SeedShipView | null {
  const root = w.rootWorld ?? w;
  if (!hasShipyard(root) && !hasMemory(root, 'makersRelay')) return null;
  const done = seedStagesDone(root);
  const chosen = seedEnding(root);
  return {
    yard: hasShipyard(root),
    done: done.length,
    total: SEED_STAGES.length,
    stages: SEED_STAGES.map(id => ({
      id,
      label: SEED_SHIP[id].label,
      line: SEED_SHIP[id].line,
      cost: `${costLine(SEED_SHIP[id].cost)}, ${SEED_SHIP[id].energy} kJ`,
      done: done.includes(id),
      blocked: done.includes(id) ? null : seedStageBlock(root, id),
    })),
    launch: seedShipComplete(root)
      ? {
        chosen,
        choices: ENDING_IDS.map(id => ({ id, label: ENDINGS[id].label, line: ENDINGS[id].line })),
        epilogue: chosen ? ENDINGS[chosen].epilogue : [],
      }
      : null,
  };
}

export interface HqView {
  /** "Headquarters" at home, "Outpost core" on another world. */
  name: string;
  level: number;
  buildings: number;
  limit: number;
  /** The next level and what it brings; null at the top. */
  next: { level: number; cost: string; adds: string } | null;
  blocked: string | null;
}

/** A mine off the base grid keeps its ore beside it: say how much, and what to do. */
function pileNote(b: Building): string {
  const kg = pileMass(b);
  if (kg < 0.5) return '';
  return ` · ${Math.round(kg)} kg piled here: not on the base grid. Land beside it to load, or run a relay line to it.`;
}

export function hqView(w: WorldState): HqView | null {
  if (!headquarters(w.colony)) return null;
  const level = hqLevel(w.colony);
  const table = levelsFor(w.colony);
  const nextLevel = level < 4 ? ((level + 1) as HqLevel) : null;
  const next = nextLevel ? table[nextLevel] : null;
  const now = table[level];
  return {
    name: centreName(w.colony),
    level,
    buildings: w.colony.buildings.length,
    limit: buildingLimit(w.colony),
    next: next && nextLevel ? {
      level: nextLevel,
      cost: `${costLine(next.cost)}, ${next.upgradeEnergy} kJ`,
      adds: `Room for ${next.buildings} buildings, +${next.ore - now.ore} kg ore, +${next.materials - now.materials} of each material, +${next.energy - now.energy} kJ stored`,
    } : null,
    blocked: hqUpgradeBlock(w),
  };
}
