import {BLUEPRINTS,PRODUCTS,type ProductInventory} from './colonyConfig';
import type {Building} from './colony';
export const facilityLevel=(b:Building):1|2|3=>b.level===3?3:b.level===2?2:1;
export const capacityFactor=(b:Building):number=>facilityLevel(b)===3?2:facilityLevel(b)===2?1.5:1;
export const workFactor=(b:Building):number=>facilityLevel(b)===3?1.5:facilityLevel(b)===2?1.25:1;
export const facilityDamageFactor=(b:Building):number=>facilityLevel(b)===3?.7:facilityLevel(b)===2?.85:1;
export function upgradeCost(b:Building,next:2|3):Partial<ProductInventory>{return Object.fromEntries(PRODUCTS.filter(p=>BLUEPRINTS[b.kind].cost[p]).map(p=>[p,BLUEPRINTS[b.kind].cost[p]!*(next===2?1:2)]));}
export function buildingCost(b:Building):Partial<ProductInventory>{const costs=[BLUEPRINTS[b.kind].cost,...(facilityLevel(b)>=2?[upgradeCost(b,2)]:[]),...(facilityLevel(b)===3?[upgradeCost(b,3)]:[])];return Object.fromEntries(PRODUCTS.map(p=>[p,costs.reduce((n,c)=>n+(c[p]??0),0)]));}
