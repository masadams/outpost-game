import {PRODUCTS} from './colonyConfig';
import {availableProduct,industrialPowerBlock} from './colonyPolicy';
import {facilityLevel,upgradeCost} from './facilityStats';
import {buildingHealth} from './buildingHealth';
import {notify} from './messages';
import {tierTechs} from './tiers';
import {TECHNOLOGIES} from './progressionConfig';
import type {WorldState} from './world';
import type {Building} from './colony';
export type BuildingUpgradeAction={type:'upgradeBuilding';id:number;level:2|3};
export function buildingUpgradeError(w:WorldState,b:Building):string|null{
 if(w.playerMode==='ship'?w.ship.state==='crashed':w.astronaut.health<=0)return 'Recover before issuing upgrade orders';
 const level=facilityLevel(b);if(level===3)return 'Maximum facility tier';
 const missing=tierTechs(b.kind,level===1?2:3).find(t=>!w.colony.research.completed.includes(t));if(missing)return `Research ${TECHNOLOGIES[missing].label}`;
 if(buildingHealth(b)<100-1e-9)return 'Repair facility fully before upgrading';
 const cost=upgradeCost(b,level===1?2:3);if(PRODUCTS.some(p=>availableProduct(w.colony,p)<(cost[p]??0)))return 'Needs unreserved local upgrade materials';
 if(industrialPowerBlock(w.colony,level===1?20:40))return `Needs ${level===1?20:40} kJ unreserved local grid charge`;
 return null;
}
export function applyBuildingUpgrade(w:WorldState,a:BuildingUpgradeAction):void{
 const b=w.colony.buildings.find(b=>b.id===a.id);if(!b){notify(w,'FACILITY NOT FOUND AT THIS COLONY');return;}
 if(a.level!==facilityLevel(b)+1){notify(w,'UPGRADE REQUEST CHANGED · INSPECT THE NEXT TIER COST');return;}
 const error=buildingUpgradeError(w,b);if(error){notify(w,error);return;}
 const next=facilityLevel(b)===1?2:3,cost=upgradeCost(b,next);
 for(const p of PRODUCTS)w.colony.products[p]-=cost[p]??0;
 w.colony.energy=Math.max(0,w.colony.energy-(next===2?20:40));b.level=next;notify(w,`FACILITY #${b.id} UPGRADED TO TIER ${next} · CAPACITY STARTS EMPTY`);
}
export function validBuildingUpgrade(w:WorldState,b:Building):boolean{return b.level===undefined||b.level===1||(b.level===2||b.level===3)&&tierTechs(b.kind,b.level).every(t=>w.colony.research.completed.includes(t));}
