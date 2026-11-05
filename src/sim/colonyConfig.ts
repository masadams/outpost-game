import type { Inventory } from './resources';
import { HABITATS, HABITAT } from './habitatConfig';

export const PRODUCTS = ['alloy', 'wire', 'components', 'water', 'oxygen', 'fuel'] as const;
export type Product = typeof PRODUCTS[number];
export type ProductInventory = Record<Product, number>;
export const BUILD_TYPES = ['solar', 'battery', 'storage', 'refinery', 'fuelProcessor', 'service', 'laser', 'flak', 'missile', 'miningRig', 'habitatSmall', 'habitatLarge', 'researchLab', 'observatory', 'shieldSmall', 'shieldLarge'] as const;
export type BuildType = typeof BUILD_TYPES[number];
export interface Blueprint { label: string; cost: Partial<ProductInventory>; halfWidth: number; color: number }
export const BLUEPRINTS: Record<BuildType, Blueprint> = {
  shieldSmall: { label: 'Small shield dome', cost: { alloy: 12, wire: 4, components: 3 }, halfWidth: 10, color: 0x92b7ff },
  shieldLarge: { label: 'Large shield dome', cost: { alloy: 20, wire: 8, components: 5 }, halfWidth: 12, color: 0x92b7ff },
  solar: { label: 'Solar array', cost: { alloy: 4, wire: 2, components: 1 }, halfWidth: 12, color: 0x86c7ff },
  battery: { label: 'Battery', cost: { alloy: 4, wire: 2, components: 2 }, halfWidth: 8, color: 0x73f3cf },
  storage: { label: 'Storage', cost: { alloy: 4, wire: 1 }, halfWidth: 10, color: 0xf3d779 },
  refinery: { label: 'Refinery', cost: { alloy: 6, wire: 2, components: 1 }, halfWidth: 10, color: 0xf5ab79 },
  fuelProcessor: { label: 'Fuel processor', cost: { alloy: 6, wire: 3, components: 1 }, halfWidth: 10, color: 0xc9b2ef },
  service: { label: 'Repair / fuel station', cost: { alloy: 4, wire: 2, components: 1 }, halfWidth: 8, color: 0x86e0ff },
  laser: { label: 'Laser turret', cost: { alloy: 8, wire: 4, components: 2 }, halfWidth: 10, color: 0xff9485 },
  flak: { label: 'Flak turret', cost: { alloy: 8, wire: 3, components: 2 }, halfWidth: 10, color: 0xffcf79 },
  missile: { label: 'Missile turret', cost: { alloy: 10, wire: 4, components: 3 }, halfWidth: 10, color: 0xe1adff },
  miningRig: { label: 'Mining rig', cost: { alloy: 8, wire: 3, components: 2 }, halfWidth: 12, color: 0x8ce9dd },
  researchLab: { label: 'Research lab', cost: { alloy: 6, wire: 3, components: 2 }, halfWidth: 10, color: 0xb9b2ff },
  observatory: { label: 'Observatory', cost: { alloy: 6, wire: 3, components: 3 }, halfWidth: 10, color: 0xa8d8ff },
  habitatSmall: { label: HABITATS.habitatSmall.label, cost: HABITATS.habitatSmall.cost, halfWidth: HABITAT.foundationHalfWidth, color: 0x86e0ff },
  habitatLarge: { label: HABITATS.habitatLarge.label, cost: HABITATS.habitatLarge.cost, halfWidth: HABITAT.foundationHalfWidth, color: 0x86e0ff },
};
export interface Recipe { label: string; raw: Partial<Inventory>; input: Partial<ProductInventory>; output: Partial<ProductInventory>; seconds: number; power: number }
export const REFINERY_RECIPES: readonly Recipe[] = [
  { label: 'Iron → alloy', raw: { iron: 1 }, input: {}, output: { alloy: 1 }, seconds: 2, power: 4 },
  { label: 'Copper → wire', raw: { copper: 1 }, input: {}, output: { wire: 1 }, seconds: 2, power: 4 },
  { label: 'Silicon → components', raw: { silicon: 0.9, rareMetals: 0.1 }, input: {}, output: { components: 1 }, seconds: 3, power: 4 },
  { label: 'Ice → water + O₂', raw: { ice: 1 }, input: {}, output: { water: 0.7, oxygen: 0.3 }, seconds: 2, power: 4 },
];
export const FUEL_RECIPE: Recipe = { label: 'Water + O₂ → fuel', raw: {}, input: { water: 1, oxygen: 0.25 }, output: { fuel: 1.25 }, seconds: 3, power: 6 };
