import type { BodyId } from './celestial';
import type { ProductInventory } from './colonyConfig';
export const TECH_IDS = ['materials', 'propulsion', 'extraction', 'combat', 'orbital', 'logistics', 'precision', 'thermal', 'ballistics', 'composites', 'ionics', 'lightweight', 'industrial', 'reactor', 'flightControl', 'navigation', 'autonomy', 'infrastructure', 'industrialSystems', 'photovoltaics', 'deepStorage', 'labAutomation', 'fieldRepair', 'surveyOptics', 'geoscience', 'aeronautics', 'massDrivers', 'podLogistics', 'deepSignal'] as const;
export type TechId = typeof TECH_IDS[number];
export interface Technology { facilityTier?: 2|3; label: string; seconds: number; requires: TechId[]; cost: Partial<ProductInventory> }
const RAW_TECHNOLOGIES: Record<TechId, Technology> = {
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
  ionics: { label:'Ion propulsion', seconds:55, requires:['orbital','thermal'], cost:{alloy:16,wire:8,components:5} },
  lightweight: { label:'Lightweight structures', seconds:50, requires:['logistics','composites'], cost:{alloy:14,wire:6,components:5} },
  industrial: { label:'Industrial extraction', seconds:55, requires:['precision','thermal'], cost:{alloy:16,wire:8,components:5} },
  reactor: { label:'Cell engineering', seconds:50, requires:['thermal','orbital'], cost:{alloy:14,wire:8,components:5} },
  flightControl:{label:'Flight control',seconds:30,requires:['materials','propulsion'],cost:{alloy:8,wire:6,components:3}},
  navigation:{label:'Return guidance',seconds:40,requires:['flightControl','orbital'],cost:{alloy:12,wire:8,components:4}},
  autonomy:{label:'Autonomous navigation',seconds:60,requires:['navigation','precision'],cost:{alloy:18,wire:12,components:6}},
  infrastructure:{facilityTier:2,label:'Infrastructure upgrades',seconds:35,requires:['materials','logistics'],cost:{alloy:10,wire:6,components:3}},
  photovoltaics:{label:'Photovoltaics',seconds:45,requires:['reactor'],cost:{alloy:12,wire:8,components:4}},
  deepStorage:{label:'Deep storage',seconds:40,requires:['lightweight'],cost:{alloy:12,wire:5,components:3}},
  labAutomation:{label:'Lab automation',seconds:50,requires:['autonomy'],cost:{alloy:14,wire:8,components:5}},
  fieldRepair:{label:'Field repair',seconds:35,requires:['ballistics'],cost:{alloy:10,wire:5,components:3}},
  podLogistics:{label:'Pod logistics',seconds:45,requires:['massDrivers','navigation'],cost:{alloy:14,wire:7,components:4}},
  surveyOptics:{label:'Survey optics',seconds:40,requires:['ionics'],cost:{alloy:12,wire:6,components:4}},
  geoscience:{label:'Geoscience',seconds:45,requires:['industrial','thermal'],cost:{alloy:14,wire:7,components:4}},
  aeronautics:{label:'Aeronautics',seconds:35,requires:['flightControl','materials'],cost:{alloy:10,wire:6,components:3}},
  massDrivers:{label:'Mass drivers',seconds:50,requires:['logistics','orbital'],cost:{alloy:14,wire:8,components:5}},
  deepSignal:{label:'Deep signal',seconds:60,requires:['surveyOptics','navigation'],cost:{alloy:16,wire:10,components:6}},
  industrialSystems:{facilityTier:3,label:'Advanced facility systems',seconds:45,requires:['infrastructure','thermal'],cost:{alloy:14,wire:8,components:4}},
};
/** How many steps of research sit below a technology: 0 for the first, one more than its deepest prerequisite. */
function techDepth(id: TechId, seen: Partial<Record<TechId, number>> = {}): number {
  const known = seen[id];
  if (known !== undefined) return known;
  const depth = RAW_TECHNOLOGIES[id].requires.reduce((deepest, req) => Math.max(deepest, techDepth(req, seen) + 1), 0);
  seen[id] = depth;
  return depth;
}
export const TECH_DEPTH: Record<TechId, number> = Object.fromEntries(TECH_IDS.map(id => [id, techDepth(id)])) as Record<TechId, number>;
/** Later research costs more: +12% for each step down the tree, so the end of the tree is a real investment. */
export const TECH_COST_STEP = 0.12;
const scaled = (cost: Partial<ProductInventory>, step: number, depth: number): Partial<ProductInventory> =>
  Object.fromEntries(Object.entries(cost).map(([k, v]) => [k, Math.ceil((v as number) * (1 + step * depth))])) as Partial<ProductInventory>;
export const TECHNOLOGIES: Record<TechId, Technology> = Object.fromEntries(
  TECH_IDS.map(id => [id, { ...RAW_TECHNOLOGIES[id], cost: scaled(RAW_TECHNOLOGIES[id].cost, TECH_COST_STEP, TECH_DEPTH[id]) }]),
) as Record<TechId, Technology>;
export const BASE_UPGRADE_IDS = ['engine', 'tank', 'cargo', 'mining', 'tractor', 'coil', 'cooling', 'armour'] as const;
export const UPGRADE_IDS = [...BASE_UPGRADE_IDS, 'efficientEngine', 'surveyTank', 'bulkHold', 'deepMining', 'precisionTractor', 'heavyCoil', 'cryoCooling', 'layeredArmour', 'ionDrive', 'lightHold', 'stripMiner', 'broadTractor', 'efficientCoil', 'capacitorCooler', 'landingComputer', 'returnComputer', 'navigationComputer', 'afterburner', 'dropTank', 'cargoBay', 'pulseMiner', 'wideTractor', 'railCoil', 'radiatorFins', 'ablativePlating', 'missionComputer'] as const;
export type UpgradeId = typeof UPGRADE_IDS[number];
export const PART_SLOTS = ['drive','tank','hold','mining','tractor','weapon','cooling','armour','avionics'] as const;
export type PartSlot = typeof PART_SLOTS[number];
export const SLOT_LABELS: Record<PartSlot,string> = {drive:'Drive',tank:'Fuel tank',hold:'Cargo hold',mining:'Mining head',tractor:'Tractor',weapon:'Cannon',cooling:'Cooling',armour:'Armour',avionics:'Flight computer'};
export interface Upgrade { slot: PartSlot; label: string; tech: TechId; cost: Partial<ProductInventory>; mass: number; benefit: string; tradeoff: string }
const RAW_UPGRADES: Record<UpgradeId, Upgrade> = {
  engine: { slot: 'drive', label: 'High-thrust engine', tech: 'propulsion', cost: { alloy: 8, wire: 4, components: 2 }, mass: 14, benefit: '18.2 kN thrust (was 14)', tradeoff: '1.04 kg/s burn (was 0.8) · more thrust, same exhaust efficiency' },
  tank: { slot: 'tank', label: 'Extended fuel tank', tech: 'propulsion', cost: { alloy: 6, wire: 3, components: 1 }, mass: 10, benefit: '320 kg fuel capacity (was 240)', tradeoff: 'Fuel bought separately; each loaded kg adds mass' },
  cargo: { slot: 'hold', label: 'Cargo rack', tech: 'materials', cost: { alloy: 6, wire: 2, components: 1 }, mass: 9, benefit: '200 kg hold (was 120)', tradeoff: 'Loaded ore and rack both reduce acceleration' },
  mining: { slot: 'mining', label: 'Powered mining head', tech: 'extraction', cost: { alloy: 8, wire: 4, components: 2 }, mass: 14, benefit: '550 m beam · 1.5× mining rate', tradeoff: '6 kW cell draw + 4 heat/s; stops when cell cannot pay or cooling locks' },
  tractor: { slot: 'tractor', label: 'Long-range tractor', tech: 'extraction', cost: { alloy: 6, wire: 4, components: 2 }, mass: 12, benefit: '360 m field (was 260)', tradeoff: '28 m/s² force limit (was 35) · 3 kW + 2 heat/s while active' },
  coil: { slot: 'weapon', label: 'Cannon coil', tech: 'combat', cost: { alloy: 8, wire: 3, components: 2 }, mass: 13, benefit: '24 cannon damage (was 18)', tradeoff: '12 kJ + 22 heat/shot (was 8 + 16); ammo/recoil unchanged' },
  cooling: { slot: 'cooling', label: 'Cooling pump', tech: 'combat', cost: { alloy: 6, wire: 4, components: 2 }, mass: 12, benefit: '30 heat/s cooling (was 20)', tradeoff: 'Cell recharge 9 kW (was 12) to run the pump' },
  armour: { slot: 'armour', label: 'Impact armour', tech: 'materials', cost: { alloy: 10, wire: 2, components: 2 }, mass: 14, benefit: '20% less incoming hull damage', tradeoff: 'No free repair; hard/overturned terrain crashes remain fatal' },
  efficientEngine: { slot:'drive', label:'Orbital drive', tech:'orbital', cost:{alloy:12,wire:5,components:3}, mass:20, benefit:'16.8 kN thrust · 0.64 kg/s burn', tradeoff:'Less peak thrust than High-thrust engine; better exhaust efficiency · heavier' },
  surveyTank: { slot:'tank', label:'Survey fuel tank', tech:'orbital', cost:{alloy:10,wire:5,components:3}, mass:18, benefit:'400 kg fuel capacity', tradeoff:'The extra room starts empty; fuel and tank both add mass' },
  bulkHold: { slot:'hold', label:'Bulk cargo hold', tech:'logistics', cost:{alloy:18,wire:6,components:4}, mass:28, benefit:'300 kg shared ore/freight capacity', tradeoff:'Large dry-mass penalty; loaded ore reduces acceleration further' },
  deepMining: { slot:'mining', label:'Deep mining head', tech:'precision', cost:{alloy:12,wire:6,components:4}, mass:22, benefit:'650 m beam · 2× mining rate', tradeoff:'10 kW cell draw + 8 heat/s; competes with weapons and tractor' },
  precisionTractor: { slot:'tractor', label:'Precision tractor', tech:'precision', cost:{alloy:10,wire:7,components:3}, mass:20, benefit:'430 m tractor field', tradeoff:'22 m/s² force limit · 6 kW + 4 heat/s; longer reach, gentler pull' },
  heavyCoil: { slot:'weapon', label:'Heavy cannon coil', tech:'ballistics', cost:{alloy:12,wire:5,components:4}, mass:21, benefit:'30 cannon damage', tradeoff:'16 kJ + 28 heat/shot; ammunition and recoil still count' },
  cryoCooling: { slot:'cooling', label:'Cryogenic cooler', tech:'thermal', cost:{alloy:10,wire:6,components:4}, mass:20, benefit:'40 heat/s cooling', tradeoff:'Only 6 kW cell recharge; cooling draws power away from the cell' },
  layeredArmour: { slot:'armour', label:'Layered armour', tech:'composites', cost:{alloy:18,wire:4,components:4}, mass:26, benefit:'35% less incoming hull damage', tradeoff:'Heavy plating; no healing or protection from catastrophic landings' },
  ionDrive: {slot:'drive',label:'Ion cruise drive',tech:'ionics',cost:{alloy:12,wire:8,components:4},mass:24,benefit:'12.6 kN thrust · 0.40 kg/s burn',tradeoff:'Lowest peak thrust; efficient cruising needs longer braking and ascent planning'},
  lightHold: {slot:'hold',label:'Lightweight hold',tech:'lightweight',cost:{alloy:7,wire:3,components:2},mass:12,benefit:'220 kg shared ore/freight capacity',tradeoff:'80 kg less space than Bulk hold; 16 kg less dry mass'},
  stripMiner: {slot:'mining',label:'Strip mining head',tech:'industrial',cost:{alloy:14,wire:7,components:4},mass:25,benefit:'360 m beam · 2.6× mining rate',tradeoff:'Short reach · 14 kW cell draw + 12 heat/s; close, power-hungry work'},
  broadTractor: {slot:'tractor',label:'Industrial tractor',tech:'industrial',cost:{alloy:12,wire:7,components:4},mass:23,benefit:'320 m field · 42 m/s² force limit',tradeoff:'9 kW + 7 heat/s; strong pull with shorter reach than Precision tractor'},
  efficientCoil: {slot:'weapon',label:'Efficient cannon coil',tech:'reactor',cost:{alloy:6,wire:3,components:1},mass:10,benefit:'21 cannon damage · 6 kJ + 12 heat/shot',tradeoff:'Lower damage than Cannon coil; same ammunition, recoil and firing interval'},
  capacitorCooler: {slot:'cooling',label:'Capacitor cooling loop',tech:'reactor',cost:{alloy:10,wire:5,components:3},mass:18,benefit:'24 heat/s cooling · 16 kW cell recharge',tradeoff:'Less cooling than Cooling pump; prioritizes cell recovery over sustained heat removal'},
  landingComputer:{slot:'avionics',label:'Landing computer',tech:'flightControl',cost:{alloy:4,wire:3,components:1},mass:8,benefit:'Automatic landing from a prepared local pad approach',tradeoff:'Draws 1 kW; you fly the approach, it lands, and it burns fuel'},
  returnComputer:{slot:'avionics',label:'Return computer',tech:'navigation',cost:{alloy:8,wire:5,components:2},mass:15,benefit:'Landing plus automatic return home and touchdown',tradeoff:'2 kW active cell draw; more mass, normal fuel and collision risks'},
  afterburner:{slot:'drive',label:'Afterburner engine',tech:'aeronautics',cost:{alloy:10,wire:5,components:3},mass:18,benefit:'22.4 kN thrust · 1.36 kg/s burn',tradeoff:'Strongest lift, poorest efficiency: it drinks fuel'},
  dropTank:{slot:'tank',label:'Drop tank',tech:'massDrivers',cost:{alloy:12,wire:6,components:4},mass:22,benefit:'440 kg fuel capacity',tradeoff:'Fuel and tank add mass; a full launch is slow'},
  cargoBay:{slot:'hold',label:'Cargo bay',tech:'deepStorage',cost:{alloy:11,wire:5,components:4},mass:20,benefit:'260 kg shared ore/freight capacity',tradeoff:'A big hold to climb out with once it is full'},
  pulseMiner:{slot:'mining',label:'Pulse mining head',tech:'geoscience',cost:{alloy:11,wire:5,components:4},mass:20,benefit:'500 m beam · 2.2× mining rate',tradeoff:'8 kW cell draw + 5 heat/s; between the powered and deep heads'},
  wideTractor:{slot:'tractor',label:'Wide-field tractor',tech:'surveyOptics',cost:{alloy:10,wire:5,components:3},mass:18,benefit:'400 m field · 30 m/s² force limit',tradeoff:'5 kW + 3 heat/s while active'},
  railCoil:{slot:'weapon',label:'Rail coil',tech:'ballistics',cost:{alloy:13,wire:6,components:5},mass:24,benefit:'40 cannon damage',tradeoff:'22 kJ + 36 heat/shot; the hardest hit, the hungriest gun'},
  radiatorFins:{slot:'cooling',label:'Radiator fins',tech:'thermal',cost:{alloy:9,wire:4,components:3},mass:16,benefit:'34 heat/s cooling',tradeoff:'11 kW cell recharge; fins catch debris'},
  ablativePlating:{slot:'armour',label:'Ablative plating',tech:'fieldRepair',cost:{alloy:16,wire:8,components:6},mass:30,benefit:'50% less incoming hull damage',tradeoff:'Heaviest plating; no healing or protection from catastrophic landings'},
  missionComputer:{slot:'avionics',label:'Mission computer',tech:'autonomy',cost:{alloy:11,wire:6,components:3},mass:20,benefit:'Landing, return home and selected-destination flight',tradeoff:'2 kW active cell draw: the same flights as the Navigation computer for less power'},
  navigationComputer:{slot:'avionics',label:'Navigation computer',tech:'autonomy',cost:{alloy:14,wire:8,components:4},mass:26,benefit:'Landing, return home and selected-destination flight',tradeoff:'3 kW active cell draw; heaviest computer, no automatic mining or resource transfers'},
};
export const UPGRADES: Record<UpgradeId, Upgrade> = RAW_UPGRADES;
export const PROGRESSION = { labPower: 4, fabricationEnergy: 20, salvageFraction: .5 } as const;
export interface ResearchProject { funding: BodyId; tech: TechId; progress: number; paused: boolean }
export interface ResearchState { completed: TechId[]; queue: ResearchProject[]; energyUsed: number }
export const createResearch = (): ResearchState => ({ completed: [], queue: [], energyUsed: 0 });
export type ProgressionAction = { type: 'researchStart'; tech: TechId } | { type: 'researchControl'; tech: TechId; operation: 'pause' | 'cancel' } | { type: 'equipment'; upgrade: UpgradeId; operation: 'install' | 'remove' };
export const isProgressionAction = (a: { type: string }): a is ProgressionAction => ['researchStart', 'researchControl', 'equipment'].includes(a.type);
