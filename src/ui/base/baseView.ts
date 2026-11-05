import { BLUEPRINTS, PRODUCTS, type BuildType, type Product } from '../../sim/colonyConfig';
import { energyCapacity, oreCapacity, productCapacity, recipeFor, type Building } from '../../sim/colony';
import { buildingHealth } from '../../sim/buildingHealth';
import { ratedPower } from '../../sim/power';
import { colonyPlanet } from '../../sim/localWorld';
import { RESOURCES, RESOURCE_INFO } from '../../sim/resources';
import { cargoMass } from '../../sim/shipMass';
import { cargoCapacity, fuelCapacity } from '../../sim/shipStats';
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
}

export type Chip = 'running' | 'idle' | 'stopped' | 'off' | 'wrecked';

export interface BuildingView {
  id: number;
  kind: BuildType;
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
  'no power': { chip: 'stopped', label: 'No power' },
  'no feedstock': { chip: 'stopped', label: 'No input' },
  'output full': { chip: 'stopped', label: 'Storage full' },
  'no deposit': { chip: 'stopped', label: 'No deposit' },
  depleted: { chip: 'stopped', label: 'Used up' },
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
  switch (b.status) {
    case 'no power':
      return 'Not enough power. Build another solar array, or a battery for the dark.';
    case 'power limited':
      return 'Running slowly because power is short.';
    case 'no feedstock':
      return `Needs ${inputNeed(b)}. Mine some and unload it at the pad.`;
    case 'output full':
      return 'Storage is full. Build Storage, or use some materials.';
    case 'wrecked':
      return 'Wrecked. Walk up to it and repair it (U).';
    case 'depleted':
      return 'The deposit under it is used up.';
    case 'no deposit':
      return 'It is not on a surface deposit.';
    case 'power reserved':
      return 'Power is being held back for essential systems.';
    case 'delivery reserved':
      return 'Storage room is being held back for deliveries.';
    default:
      return null;
  }
}

export function buildingView(b: Building): BuildingView {
  const health = buildingHealth(b);
  // Solar, batteries and storage have no work cycle: they either work or are switched off / wrecked.
  const passive = b.kind === 'solar' || b.kind === 'battery' || b.kind === 'storage';
  const status =
    passive && health > 0 && (b.enabled || b.kind !== 'solar')
      ? { chip: 'running' as const, label: b.kind === 'solar' ? 'Generating' : 'Ready' }
      : (STATUS[b.status] ?? { chip: b.status === 'running' ? 'running' : 'idle', label: b.status });
  const recipe = recipeFor(b);
  const power = ratedPower(b);
  const facts: Array<[string, string]> = [];
  if (recipe) facts.push(['Making', recipe.label], ['Batch time', `${recipe.seconds} s`]);
  if (power) facts.push([b.kind === 'solar' ? 'Output' : 'Power', `${power.toFixed(1)} kW`]);
  if (b.kind === 'battery') facts.push(['Stores', '200 kJ']);
  if (b.kind === 'storage') facts.push(['Holds', '+200 kg ore, +100 each product']);
  facts.push(['Condition', `${health.toFixed(0)}%`]);
  const why = whyStopped(b);
  return {
    id: b.id,
    kind: b.kind,
    label: BLUEPRINTS[b.kind].label,
    chip: status.chip,
    chipLabel: status.label,
    line: why ?? (recipe && status.chip === 'running' ? recipe.label : status.label),
    why,
    facts,
    canToggle: b.kind !== 'storage' && b.kind !== 'battery' && health > 0,
    enabled: b.enabled,
    canCycleRecipe: b.kind === 'refinery' && health > 0,
  };
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
    summary: c.generation <= 0 && c.demand <= 0 ? 'No power yet. Build a solar array.' : `Using ${c.demand.toFixed(1)} of ${c.generation.toFixed(1)} kW`,
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

export function baseView(w: WorldState): BaseView {
  const c = w.colony;
  const buildings = c.buildings.map(buildingView);
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
  };
}
