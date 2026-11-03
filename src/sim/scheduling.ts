import { PRODUCTS, REFINERY_RECIPES, type Product, type ProductInventory, type Recipe } from './colonyConfig';
import type { Building } from './colony';
import type { WorldState } from './world';

export const SCHEDULE_PRODUCTS = ['alloy', 'wire', 'components', 'water', 'oxygen'] as const;
export type ScheduleProduct = typeof SCHEDULE_PRODUCTS[number];
export const MAX_STOCK_TARGET = 1000;
export interface RefinerySchedule { enabled: boolean; cursor: number; targets: Record<ScheduleProduct, number> }
export type SchedulingAction = { type: 'toggleSchedule' } | { type: 'adjustTarget'; product: ScheduleProduct; delta: -5 | 5 };
export const createSchedule = (): RefinerySchedule => ({ enabled: false, cursor: 0, targets: { alloy: 20, wire: 10, components: 5, water: 10, oxygen: 5 } });

export function hasRecipeInputs(world: WorldState, recipe: Recipe): boolean {
  return Object.entries(recipe.raw).every(([r, q]) => world.depot[r as keyof typeof world.depot] + 1e-9 >= q) &&
    Object.entries(recipe.input).every(([p, q]) => world.colony.products[p as Product] + 1e-9 >= q);
}
export function hasRecipeRoom(stock: ProductInventory, recipe: Recipe, capacity: number): boolean {
  return Object.entries(recipe.output).every(([p, q]) => stock[p as Product] + q <= capacity);
}
/** Select only at a cycle boundary: paid progress is never silently discarded. */
export function selectScheduledRecipe(world: WorldState, building: Building, capacity: number): boolean {
  const schedule = building.schedule;
  if (!schedule?.enabled || building.progress > 0) return true;
  let waiting: number | undefined;
  for (let i = 0; i < REFINERY_RECIPES.length; i++) {
    const index = (schedule.cursor + i) % REFINERY_RECIPES.length, recipe = REFINERY_RECIPES[index];
    if (!SCHEDULE_PRODUCTS.some(p => (recipe.output[p] ?? 0) > 0 && world.colony.products[p] + 1e-9 < schedule.targets[p])) continue;
    waiting ??= index;
    if (hasRecipeInputs(world, recipe) && hasRecipeRoom(world.colony.products, recipe, capacity)) { building.recipe = index; return true; }
  }
  // Leave the normal production checks to explain the first blocked outstanding goal.
  if (waiting !== undefined) { building.recipe = waiting; return true; }
  building.status = 'target met'; return false;
}
export function validSchedule(value: unknown): value is RefinerySchedule {
  if (value === null || typeof value !== 'object') return false;
  const s = value as RefinerySchedule;
  return typeof s.enabled === 'boolean' && Number.isInteger(s.cursor) && s.cursor >= 0 && s.cursor < REFINERY_RECIPES.length &&
    s.targets !== null && typeof s.targets === 'object' && !Array.isArray(s.targets) &&
    SCHEDULE_PRODUCTS.every(p => Number.isFinite(s.targets[p]) && s.targets[p] >= 0 && s.targets[p] <= MAX_STOCK_TARGET) &&
    Object.keys(s.targets).every(p => PRODUCTS.includes(p as Product) && p !== 'fuel');
}
