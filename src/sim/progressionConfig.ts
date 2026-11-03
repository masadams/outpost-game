import type { BodyId } from './celestial';
import type { ProductInventory } from './colonyConfig';
export const TECH_IDS = ['materials', 'propulsion', 'extraction', 'combat'] as const;
export type TechId = typeof TECH_IDS[number];
export interface Technology { label: string; seconds: number; requires: TechId[]; cost: Partial<ProductInventory> }
export const TECHNOLOGIES: Record<TechId, Technology> = {
  materials: { label: 'Applied materials', seconds: 15, requires: [], cost: { alloy: 4, wire: 2, components: 1 } },
  propulsion: { label: 'Propulsion systems', seconds: 20, requires: ['materials'], cost: { alloy: 6, wire: 3, components: 1 } },
  extraction: { label: 'Powered extraction', seconds: 20, requires: ['materials'], cost: { alloy: 6, wire: 3, components: 1 } },
  combat: { label: 'Combat engineering', seconds: 25, requires: ['propulsion', 'extraction'], cost: { alloy: 8, wire: 4, components: 2 } },
};
export const UPGRADE_IDS = ['engine', 'tank', 'cargo', 'mining', 'tractor', 'coil', 'cooling', 'armour'] as const;
export type UpgradeId = typeof UPGRADE_IDS[number];
export interface Upgrade { label: string; tech: TechId; cost: Partial<ProductInventory>; mass: number; benefit: string; tradeoff: string }
export const UPGRADES: Record<UpgradeId, Upgrade> = {
  engine: { label: 'High-thrust engine', tech: 'propulsion', cost: { alloy: 8, wire: 4, components: 2 }, mass: 14, benefit: '18.2 kN thrust (was 14)', tradeoff: '1.04 kg/s burn (was 0.8) · more thrust, same exhaust efficiency' },
  tank: { label: 'Extended fuel tank', tech: 'propulsion', cost: { alloy: 6, wire: 3, components: 1 }, mass: 10, benefit: '320 kg fuel capacity (was 240)', tradeoff: 'Fuel bought separately; each loaded kg adds mass' },
  cargo: { label: 'Cargo rack', tech: 'materials', cost: { alloy: 6, wire: 2, components: 1 }, mass: 9, benefit: '200 kg hold (was 120)', tradeoff: 'Loaded ore and rack both reduce acceleration' },
  mining: { label: 'Powered mining head', tech: 'extraction', cost: { alloy: 8, wire: 4, components: 2 }, mass: 14, benefit: '550 m beam · 1.5× mining rate', tradeoff: '6 kW cell draw + 4 heat/s; stops when cell cannot pay or cooling locks' },
  tractor: { label: 'Long-range tractor', tech: 'extraction', cost: { alloy: 6, wire: 4, components: 2 }, mass: 12, benefit: '360 m field (was 260)', tradeoff: '28 m/s² force limit (was 35) · 3 kW + 2 heat/s while active' },
  coil: { label: 'Cannon coil', tech: 'combat', cost: { alloy: 8, wire: 3, components: 2 }, mass: 13, benefit: '24 cannon damage (was 18)', tradeoff: '12 kJ + 22 heat/shot (was 8 + 16); ammo/recoil unchanged' },
  cooling: { label: 'Cooling pump', tech: 'combat', cost: { alloy: 6, wire: 4, components: 2 }, mass: 12, benefit: '30 heat/s cooling (was 20)', tradeoff: 'Cell recharge 9 kW (was 12) to run the pump' },
  armour: { label: 'Impact armour', tech: 'materials', cost: { alloy: 10, wire: 2, components: 2 }, mass: 14, benefit: '20% less incoming hull damage', tradeoff: 'No free repair; hard/overturned terrain crashes remain fatal' },
};
export const PROGRESSION = { labPower: 4, fabricationEnergy: 20, salvageFraction: .5 } as const;
export interface ResearchProject { funding: BodyId; tech: TechId; progress: number; paused: boolean }
export interface ResearchState { completed: TechId[]; queue: ResearchProject[]; energyUsed: number }
export const createResearch = (): ResearchState => ({ completed: [], queue: [], energyUsed: 0 });
export type ProgressionAction = { type: 'researchStart'; tech: TechId } | { type: 'researchControl'; tech: TechId; operation: 'pause' | 'cancel' } | { type: 'equipment'; upgrade: UpgradeId; operation: 'install' | 'remove' };
export const isProgressionAction = (a: { type: string }): a is ProgressionAction => ['researchStart', 'researchControl', 'equipment'].includes(a.type);
