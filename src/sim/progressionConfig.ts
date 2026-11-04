import type { BodyId } from './celestial';
import type { ProductInventory } from './colonyConfig';
export const TECH_IDS = ['materials', 'propulsion', 'extraction', 'combat', 'orbital', 'logistics', 'precision', 'thermal', 'ballistics', 'composites'] as const;
export type TechId = typeof TECH_IDS[number];
export interface Technology { label: string; seconds: number; requires: TechId[]; cost: Partial<ProductInventory> }
export const TECHNOLOGIES: Record<TechId, Technology> = {
  materials: { label: 'Applied materials', seconds: 15, requires: [], cost: { alloy: 4, wire: 2, components: 1 } },
  propulsion: { label: 'Propulsion systems', seconds: 20, requires: ['materials'], cost: { alloy: 6, wire: 3, components: 1 } },
  extraction: { label: 'Powered extraction', seconds: 20, requires: ['materials'], cost: { alloy: 6, wire: 3, components: 1 } },
  combat: { label: 'Combat engineering', seconds: 25, requires: ['propulsion', 'extraction'], cost: { alloy: 8, wire: 4, components: 2 } },
  orbital: { label: 'Orbital propulsion', seconds: 35, requires: ['propulsion'], cost: { alloy: 10, wire: 5, components: 3 } },
  logistics: { label: 'Bulk logistics', seconds: 30, requires: ['materials', 'extraction'], cost: { alloy: 8, wire: 4, components: 2 } },
  precision: { label: 'Precision extraction', seconds: 40, requires: ['extraction'], cost: { alloy: 10, wire: 6, components: 3 } },
  thermal: { label: 'Thermal engineering', seconds: 35, requires: ['propulsion', 'extraction'], cost: { alloy: 10, wire: 6, components: 3 } },
  ballistics: { label: 'Advanced ballistics', seconds: 45, requires: ['combat'], cost: { alloy: 12, wire: 6, components: 4 } },
  composites: { label: 'Layered composites', seconds: 45, requires: ['materials', 'combat'], cost: { alloy: 12, wire: 5, components: 4 } },
};
export const BASE_UPGRADE_IDS = ['engine', 'tank', 'cargo', 'mining', 'tractor', 'coil', 'cooling', 'armour'] as const;
export const UPGRADE_IDS = [...BASE_UPGRADE_IDS, 'efficientEngine', 'surveyTank', 'bulkHold', 'deepMining', 'precisionTractor', 'heavyCoil', 'cryoCooling', 'layeredArmour'] as const;
export type UpgradeId = typeof UPGRADE_IDS[number];
export const PART_SLOTS = ['drive','tank','hold','mining','tractor','weapon','cooling','armour'] as const;
export type PartSlot = typeof PART_SLOTS[number];
export const SLOT_LABELS: Record<PartSlot,string> = {drive:'Drive',tank:'Fuel tank',hold:'Cargo hold',mining:'Mining head',tractor:'Tractor',weapon:'Cannon',cooling:'Cooling',armour:'Armour'};
export interface Upgrade { slot: PartSlot; label: string; tech: TechId; cost: Partial<ProductInventory>; mass: number; benefit: string; tradeoff: string }
export const UPGRADES: Record<UpgradeId, Upgrade> = {
  engine: { slot: 'drive', label: 'High-thrust engine', tech: 'propulsion', cost: { alloy: 8, wire: 4, components: 2 }, mass: 14, benefit: '18.2 kN thrust (was 14)', tradeoff: '1.04 kg/s burn (was 0.8) · more thrust, same exhaust efficiency' },
  tank: { slot: 'tank', label: 'Extended fuel tank', tech: 'propulsion', cost: { alloy: 6, wire: 3, components: 1 }, mass: 10, benefit: '320 kg fuel capacity (was 240)', tradeoff: 'Fuel bought separately; each loaded kg adds mass' },
  cargo: { slot: 'hold', label: 'Cargo rack', tech: 'materials', cost: { alloy: 6, wire: 2, components: 1 }, mass: 9, benefit: '200 kg hold (was 120)', tradeoff: 'Loaded ore and rack both reduce acceleration' },
  mining: { slot: 'mining', label: 'Powered mining head', tech: 'extraction', cost: { alloy: 8, wire: 4, components: 2 }, mass: 14, benefit: '550 m beam · 1.5× mining rate', tradeoff: '6 kW cell draw + 4 heat/s; stops when cell cannot pay or cooling locks' },
  tractor: { slot: 'tractor', label: 'Long-range tractor', tech: 'extraction', cost: { alloy: 6, wire: 4, components: 2 }, mass: 12, benefit: '360 m field (was 260)', tradeoff: '28 m/s² force limit (was 35) · 3 kW + 2 heat/s while active' },
  coil: { slot: 'weapon', label: 'Cannon coil', tech: 'combat', cost: { alloy: 8, wire: 3, components: 2 }, mass: 13, benefit: '24 cannon damage (was 18)', tradeoff: '12 kJ + 22 heat/shot (was 8 + 16); ammo/recoil unchanged' },
  cooling: { slot: 'cooling', label: 'Cooling pump', tech: 'combat', cost: { alloy: 6, wire: 4, components: 2 }, mass: 12, benefit: '30 heat/s cooling (was 20)', tradeoff: 'Cell recharge 9 kW (was 12) to run the pump' },
  armour: { slot: 'armour', label: 'Impact armour', tech: 'materials', cost: { alloy: 10, wire: 2, components: 2 }, mass: 14, benefit: '20% less incoming hull damage', tradeoff: 'No free repair; hard/overturned terrain crashes remain fatal' },
  efficientEngine: { slot:'drive', label:'Orbital drive', tech:'orbital', cost:{alloy:12,wire:5,components:3}, mass:20, benefit:'16.8 kN thrust · 0.64 kg/s burn', tradeoff:'Less peak thrust than High-thrust engine; better exhaust efficiency · heavier' },
  surveyTank: { slot:'tank', label:'Survey fuel tank', tech:'orbital', cost:{alloy:10,wire:5,components:3}, mass:18, benefit:'400 kg fuel capacity', tradeoff:'Extra capacity starts empty; fuel and tank add real mass' },
  bulkHold: { slot:'hold', label:'Bulk cargo hold', tech:'logistics', cost:{alloy:18,wire:6,components:4}, mass:28, benefit:'300 kg shared ore/freight capacity', tradeoff:'Large dry-mass penalty; loaded ore reduces acceleration further' },
  deepMining: { slot:'mining', label:'Deep mining head', tech:'precision', cost:{alloy:12,wire:6,components:4}, mass:22, benefit:'650 m beam · 2× mining rate', tradeoff:'10 kW cell draw + 8 heat/s; competes with weapons and tractor' },
  precisionTractor: { slot:'tractor', label:'Precision tractor', tech:'precision', cost:{alloy:10,wire:7,components:3}, mass:20, benefit:'430 m tractor field', tradeoff:'22 m/s² force limit · 6 kW + 4 heat/s; longer reach, gentler pull' },
  heavyCoil: { slot:'weapon', label:'Heavy cannon coil', tech:'ballistics', cost:{alloy:12,wire:5,components:4}, mass:21, benefit:'30 cannon damage', tradeoff:'16 kJ + 28 heat/shot; ammunition and recoil still count' },
  cryoCooling: { slot:'cooling', label:'Cryogenic cooler', tech:'thermal', cost:{alloy:10,wire:6,components:4}, mass:20, benefit:'40 heat/s cooling', tradeoff:'Only 6 kW cell recharge; cooling draws power away from the cell' },
  layeredArmour: { slot:'armour', label:'Layered armour', tech:'composites', cost:{alloy:18,wire:4,components:4}, mass:26, benefit:'35% less incoming hull damage', tradeoff:'Heavy plating; no healing or protection from catastrophic landings' },
};
export const PROGRESSION = { labPower: 4, fabricationEnergy: 20, salvageFraction: .5 } as const;
export interface ResearchProject { funding: BodyId; tech: TechId; progress: number; paused: boolean }
export interface ResearchState { completed: TechId[]; queue: ResearchProject[]; energyUsed: number }
export const createResearch = (): ResearchState => ({ completed: [], queue: [], energyUsed: 0 });
export type ProgressionAction = { type: 'researchStart'; tech: TechId } | { type: 'researchControl'; tech: TechId; operation: 'pause' | 'cancel' } | { type: 'equipment'; upgrade: UpgradeId; operation: 'install' | 'remove' };
export const isProgressionAction = (a: { type: string }): a is ProgressionAction => ['researchStart', 'researchControl', 'equipment'].includes(a.type);
