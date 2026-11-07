import { cargoMass } from './shipMass';
import { colonyPlanet, localPosition, localAngleAt } from './localWorld';
import { UPGRADES, UPGRADE_IDS, PROGRESSION, type UpgradeId, type ProgressionAction } from './progressionConfig';
import { PRODUCTS } from './colonyConfig';
import { productCapacity } from './colony';
import { availableProduct, industrialPowerBlock } from './colonyPolicy';
import { cargoCapacity, fuelCapacity, fittedPart } from './shipStats';
import { WORLD } from './config';
import { wrap } from './math';
import { notify } from './messages';
import { workshopReady } from './airMachines';
import type { WorldState } from './world';
export function shopError(w: WorldState): string | null {
  const away = w.siteBody !== undefined && w.siteBody !== 'home';
  if (away && !workshopReady(w)) return 'Fitting parts away from home needs a powered Workshop on this world';
  const s = w.ship;
  if (s.state !== 'landed' || Math.abs(Math.hypot(localPosition(w, s.position).x, localPosition(w, s.position).y) - colonyPlanet(w).radius - WORLD.shipRadius) > .1 || Math.abs(wrap(localAngleAt(w, s.position))) * colonyPlanet(w).radius > WORLD.padHalfWidth) return away ? 'Land on this world\'s pad for equipment work' : 'Land on the home pad for equipment work';
  if (w.playerMode === 'astronaut' && (!w.astronaut.grounded || w.astronaut.health <= 0 || Math.hypot(w.astronaut.position.x - s.position.x, w.astronaut.position.y - s.position.y) > 20)) return 'Board or stand within 20 m of the ship on the pad';
  return null;
}
export function equipmentPlan(w: WorldState, id: UpgradeId, operation: 'install'|'remove') {
  const s=w.ship, spec=UPGRADES[id];
  const previous=operation==='install'?fittedPart(s,spec.slot):id;
  const equipment=s.equipment.filter(part=>operation==='install'?UPGRADES[part].slot!==spec.slot:part!==id);
  if(operation==='install')equipment.push(id);
  const fuelReturn=Math.max(0,s.fuel-fuelCapacity({equipment}));
  const refund=Object.fromEntries(PRODUCTS.map(p=>[p,previous?(UPGRADES[previous].cost[p]??0)*PROGRESSION.salvageFraction*s.hull/100:0]));
  return {previous,equipment,fuelReturn,refund};
}
export function equipmentError(w: WorldState, id: UpgradeId, operation: 'install' | 'remove'): string | null {
  if (!UPGRADE_IDS.includes(id)) return 'Unknown equipment';
  const at=shopError(w);if(at)return at;
  const spec=UPGRADES[id],s=w.ship,installed=s.equipment.includes(id);
  if(operation==='install'){
    if(installed)return 'Already installed · no stacking';
    if(!w.colony.research.completed.includes(spec.tech))return 'Research required before fabrication';
    if(PRODUCTS.some(p=>availableProduct(w.colony,p)+1e-9<(spec.cost[p]??0)))return 'Needs unreserved fabrication materials · full cost before salvage';
    if(industrialPowerBlock(w.colony,PROGRESSION.fabricationEnergy))return `Needs ${PROGRESSION.fabricationEnergy} kJ unreserved grid energy`;
  }else if(!installed)return 'Equipment is not installed';
  const plan=equipmentPlan(w,id,operation),capacity=cargoCapacity({equipment:plan.equipment});
  if(cargoMass(s)>capacity+1e-9)return `Unload cargo below ${capacity} kg before changing hold`;
  if(PRODUCTS.some(p=>w.colony.products[p]-(operation==='install'?(spec.cost[p]??0):0)+plan.refund[p]+(p==='fuel'?plan.fuelReturn:0)>productCapacity(w.colony)+1e-9))return 'Make stock room for salvage and excess tank fuel';
  return null;
}
export function applyEquipment(w: WorldState,a:Extract<ProgressionAction,{type:'equipment'}>):void{
  if(!['install','remove'].includes(a.operation))return;
  const error=equipmentError(w,a.upgrade,a.operation);if(error){notify(w,error);return;}
  const spec=UPGRADES[a.upgrade],s=w.ship,plan=equipmentPlan(w,a.upgrade,a.operation);
  for(const p of PRODUCTS)w.colony.products[p]+=plan.refund[p]-(a.operation==='install'?(spec.cost[p]??0):0)+(p==='fuel'?plan.fuelReturn:0);
  if(a.operation==='install')w.colony.energy=Math.max(0,w.colony.energy-PROGRESSION.fabricationEnergy);
  s.fuel-=plan.fuelReturn;s.equipment=plan.equipment;
  notify(w,a.operation==='install'?`${spec.label.toUpperCase()} FITTED · ONE PART PER SLOT · MATERIALS AND ENERGY PAID`:'PART REMOVED · HULL-SCALED 50% SALVAGE · EXCESS FUEL RETURNED');
}
