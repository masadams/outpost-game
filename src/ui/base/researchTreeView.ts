import { BLUEPRINTS, BUILD_TYPES, type BuildType } from '../../sim/colonyConfig';
import type { Building } from '../../sim/colony';
import { facilityLevel } from '../../sim/facilityStats';
import { tierTechs } from '../../sim/tiers';
import { blueprintRevealed } from '../../sim/unlocks';
import { featureVisible } from '../../preferences/features';
import { PURPOSE } from '../build/buildView';
import { tierEffect } from './upgradeView';
import { equipmentError } from '../../sim/equipment';
import { FINDS, isFindTech } from '../../sim/finds';
import { PRODUCTS } from '../../sim/colonyConfig';
import { availableProduct } from '../../sim/colonyPolicy';
import { shipRole } from '../../sim/shipProfile';
import { researchError } from '../../sim/research';
import { PART_SLOTS, SLOT_LABELS, TECHNOLOGIES, TECH_IDS, UPGRADE_IDS, UPGRADES, type PartSlot, type TechId, type UpgradeId } from '../../sim/progressionConfig';
import { TECH_POSITIONS } from '../techTree';
import type { WorldState } from '../../sim/world';

export type NodeState = 'done' | 'active' | 'ready' | 'locked';

export interface TreeNode {
  id: TechId;
  label: string;
  col: number;
  row: number;
  state: NodeState;
  /** One plain line: what it is doing now, or what it still needs. */
  line: string;
  cost: string;
  seconds: number;
  /** 0 to 1 while a project runs. */
  progress: number | null;
  requires: Array<{ id: TechId; label: string; done: boolean }>;
  /** What finishing it opens, in words. */
  unlocks: string[];
  /** Present when it can be started now, or says why not. */
  start: { reason: string | null } | null;
}

export interface TreeEdge { from: TechId; to: TechId; done: boolean }

export interface PartRow {
  id: UpgradeId;
  label: string;
  benefit: string;
  tradeoff: string;
  techLabel: string;
  state: 'fitted' | 'ready' | 'locked';
  /** Why it cannot be fitted now, or null. */
  reason: string | null;
  cost: string;
  /** What fitting it would make the ship, in a few words. */
  role: string;
}

export interface TierStep {
  tier: 2 | 3;
  /** What the tier changes, in a few words. */
  effect: string;
  needs: Array<{ id: TechId; label: string; done: boolean }>;
  /** Buildings of this kind already at this tier or above. */
  have: number;
}

export interface BuildingRow {
  kind: BuildType;
  label: string;
  purpose: string;
  /** Whether it is in the Build menu now. */
  open: boolean;
  /** How it is earned, in a few words. */
  earned: string;
  built: number;
  tiers: TierStep[];
}

export interface ResearchTreeView {
  buildings: BuildingRow[];
  nodes: TreeNode[];
  edges: TreeEdge[];
  columns: number;
  rows: number;
  hasLab: boolean;
  slots: Array<{ slot: PartSlot; label: string; fitted: string | null; parts: PartRow[] }>;
}

const costText = (cost: Partial<Record<string, number>>): string =>
  Object.entries(cost).filter(([, n]) => (n ?? 0) > 0).map(([k, n]) => `${n} ${k}`).join(', ');

/** Buildings and upgrades a technology opens that are not ship parts. */
const EXTRA_UNLOCKS: Partial<Record<TechId, string[]>> = {
  precision: ['Mining drone bay'],
  geoscience: ['Geothermal tap'],
  aeronautics: ['Wind turbine'],
  massDrivers: ['Mass driver'],
  photovoltaics: ['Solar arrays make 20% more'],
  deepStorage: ['Storage holds 25% more'],
  labAutomation: ['Research labs work 50% faster'],
  fieldRepair: ['Repairs cost half the alloy'],
  podLogistics: ['Cargo pods are lost half as often'],
  surveyOptics: ['Observatories watch 25% faster'],
  deepSignal: ['A one-way beacon that listens for a far system'],
  combat: ['Shield domes'],
  infrastructure: ['Tier II building upgrades'],
  industrialSystems: ['Tier III building upgrades'],
};

function needText(w: WorldState, tech: TechId): string {
  const cost = TECHNOLOGIES[tech].cost;
  const short = PRODUCTS.filter(p => availableProduct(w.colony, p) + 1e-9 < (cost[p] ?? 0));
  return `Needs ${short.map(p => `${cost[p]} ${p} (you have ${Math.floor(availableProduct(w.colony, p))})`).join(', ')}`;
}

function nodeLine(w: WorldState, tech: TechId, state: NodeState, error: string | null, hasLab: boolean): string {
  const spec = TECHNOLOGIES[tech];
  const r = w.colony.research;
  if (state === 'done') return 'Researched.';
  if (state === 'active') return hasLab ? 'Researching…' : 'Waiting for a Research lab.';
  if (error === 'Study a find first') {
    const find = FINDS.find(f => f.tech === tech);
    return `Needs a find: ${find?.label ?? 'something out there'}.`;
  }
  if (error === 'Complete prerequisite research first') {
    const missing = spec.requires.filter(id => !r.completed.includes(id)).map(id => TECHNOLOGIES[id].label);
    return `Needs ${missing.join(' and ')} first.`;
  }
  if (error === 'Needs unreserved research materials') return `${needText(w, tech)}.`;
  if (!hasLab) return 'Build a Research lab to start it.';
  return 'Ready to research.';
}

function roleAfter(w: WorldState, slot: PartSlot, id: UpgradeId, fitted: boolean): string {
  const now = shipRole(w.ship).role;
  if (fitted) return `Makes it a ${now.toLowerCase()}.`;
  const next = shipRole({ equipment: [...w.ship.equipment.filter(p => UPGRADES[p].slot !== slot), id] }).role;
  return next === now ? `Still a ${now.toLowerCase()}.` : `Would make it a ${next.toLowerCase()}.`;
}

const EARNED: Record<BuildType, string> = {
  solar: 'From the start',
  refinery: 'From the start',
  battery: 'After your first industry',
  storage: 'After your first industry',
  fuelProcessor: 'After your first industry',
  miningRig: 'After your first industry',
  relay: 'After your first industry',
  condenser: 'After your first industry',
  geothermal: 'Research Geoscience',
  windTurbine: 'Research Aeronautics',
  massDriver: 'Research Mass drivers',
  observatory: 'After the survey buoy data',
  researchLab: 'After studying a find',
  antenna: 'Once an Observatory stands',
  laser: 'Once an Observatory stands',
  missile: 'From the second storm',
  shieldSmall: 'After the second storm',
  shieldLarge: 'After a small shield dome',
  habitatSmall: 'After a base on another world',
  habitatLarge: 'After a small habitat',
  workshop: 'After a base on another world',
  droneBay: 'Research Precision extraction',
  service: 'Not offered yet',
  flak: 'Not offered yet',
};

function buildingRows(w: WorldState): BuildingRow[] {
  const root = w.rootWorld ?? w;
  const done = root.colony.research.completed;
  const colonies = [root.colony, ...Object.values(root.outposts).map(o => o.colony)];
  return BUILD_TYPES.map(kind => {
    const mine = colonies.flatMap(c => c.buildings.filter(b => b.kind === kind));
    const tiers: TierStep[] = ([2, 3] as const).map(tier => ({
      tier,
      effect: tierEffect({ kind, level: tier } as Building, tier),
      needs: tierTechs(kind, tier).map(id => ({ id, label: TECHNOLOGIES[id].label, done: done.includes(id) })),
      have: mine.filter(b => facilityLevel(b) >= tier).length,
    }));
    return {
      kind,
      label: BLUEPRINTS[kind].label,
      purpose: PURPOSE[kind],
      open: blueprintRevealed(root, kind) || featureVisible('catalogue'),
      earned: EARNED[kind],
      built: mine.length,
      tiers,
    };
  });
}

export function researchTreeView(w: WorldState): ResearchTreeView {
  const root = w.rootWorld ?? w;
  const r = root.colony.research;
  const hasLab = root.colony.buildings.some(b => b.kind === 'researchLab');
  const nodes: TreeNode[] = TECH_IDS.map(id => {
    const spec = TECHNOLOGIES[id];
    const queued = r.queue.find(p => p.tech === id);
    const error = researchError(root, id);
    const state: NodeState = r.completed.includes(id) ? 'done' : queued ? 'active' : error === null ? 'ready' : 'locked';
    const parts = UPGRADE_IDS.filter(u => UPGRADES[u].tech === id).map(u => `${UPGRADES[u].label} (${SLOT_LABELS[UPGRADES[u].slot]})`);
    const [col, row] = TECH_POSITIONS[id];
    return {
      id,
      label: spec.label,
      col,
      row,
      state,
      line: nodeLine(root, id, state, error, hasLab),
      cost: costText(spec.cost),
      seconds: spec.seconds,
      progress: queued ? queued.progress / spec.seconds : null,
      requires: spec.requires.map(req => ({ id: req, label: TECHNOLOGIES[req].label, done: r.completed.includes(req) })),
      unlocks: [...parts, ...(EXTRA_UNLOCKS[id] ?? [])],
      start: state === 'locked' || state === 'ready' ? { reason: error ?? (hasLab ? null : 'Build a Research lab first') } : null,
    };
  });
  const edges: TreeEdge[] = TECH_IDS.flatMap(to => TECHNOLOGIES[to].requires.map(from => ({ from, to, done: r.completed.includes(from) })));
  const slots = PART_SLOTS.map(slot => {
    const fittedId = root.ship.equipment.find(id => UPGRADES[id].slot === slot) ?? null;
    const parts: PartRow[] = UPGRADE_IDS.filter(id => UPGRADES[id].slot === slot).map(id => {
      const spec = UPGRADES[id];
      const known = r.completed.includes(spec.tech);
      const fitted = root.ship.equipment.includes(id);
      const state: PartRow['state'] = fitted ? 'fitted' : known ? 'ready' : 'locked';
      return {
        id,
        label: spec.label,
        benefit: spec.benefit,
        tradeoff: spec.tradeoff,
        techLabel: TECHNOLOGIES[spec.tech].label,
        state,
        reason: fitted ? null : known ? equipmentError(root, id, 'install') : `Needs ${TECHNOLOGIES[spec.tech].label}.`,
        cost: costText(spec.cost),
        role: roleAfter(root, slot, id, fitted),
      };
    });
    return { slot, label: SLOT_LABELS[slot], fitted: fittedId ? UPGRADES[fittedId].label : null, parts };
  });
  const cols = Math.max(...nodes.map(n => n.col)) + 1;
  const rows = Math.max(...nodes.map(n => n.row)) + 1;
  return { buildings: buildingRows(w), nodes, edges, columns: cols, rows, hasLab, slots };
}

export { isFindTech };
