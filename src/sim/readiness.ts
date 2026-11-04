import { RECOVERY,SHIP_WEAPONS } from './combatConfig';
import { availableProduct,policyFor } from './colonyPolicy';
import { FUEL_RECIPE,REFINERY_RECIPES } from './colonyConfig';
import { colonyPlanet } from './localWorld';
import { nearestPlanet } from './celestial';
import { fuelCapacity } from './shipStats';
import { cargoMass } from './shipMass';
import { operational } from './buildingHealth';
import type { WorldState } from './world';

/** A specific funding check, never a promise of survival or an automatic reservation. */
export function recoveryReadiness(source:WorldState){
 const w=source.rootWorld??source;
 const rows=(['alloy','components'] as const).map(product=>({product,need:RECOVERY.cost[product],stock:w.colony.products[product],usable:availableProduct(w.colony,product),shortfall:Math.max(0,RECOVERY.cost[product]-availableProduct(w.colony,product))}));
 const repairHull=w.ship.state==='crashed'?RECOVERY.hull:w.ship.hull;
 return {rows,funded:rows.every(r=>r.shortfall<=1e-9),canRecover:w.ship.state==='crashed'&&rows.every(r=>r.shortfall<=1e-9),hull:RECOVERY.hull,fuel:Math.min(w.ship.fuel,RECOVERY.fuel),lostCargo:cargoMass(w.ship),repairAlloy:Math.max(0,100-repairHull)/10,
  rearmAlloy:(SHIP_WEAPONS.cannon.capacity-w.ship.armament.cannon)*SHIP_WEAPONS.cannon.alloy+(SHIP_WEAPONS.missile.capacity-w.ship.armament.missile)*SHIP_WEAPONS.missile.alloy,
  rearmComponents:(SHIP_WEAPONS.missile.capacity-w.ship.armament.missile)*SHIP_WEAPONS.missile.components};
}
export function fuelPlan(w:WorldState,requested:number){
 const valid=Number.isFinite(requested)&&requested>=0&&requested<=1000;
 const recipe=REFINERY_RECIPES.find(r=>(r.output.water??0)>0&&(r.output.oxygen??0)>0)!;
 const cycles=valid?Math.max(0,Math.ceil((requested-1e-9)/FUEL_RECIPE.output.fuel!)):0;
 const water=cycles*FUEL_RECIPE.input.water!,oxygen=cycles*FUEL_RECIPE.input.oxygen!;
 const missingWater=Math.max(0,water-availableProduct(w.colony,'water')),missingOxygen=Math.max(0,oxygen-availableProduct(w.colony,'oxygen'));
 // Both co-products come from the same ice cycles; do not charge ice twice.
 const iceCycles=Math.max(0,Math.ceil(Math.max(missingWater/recipe.output.water!,missingOxygen/recipe.output.oxygen!)-1e-9));
 const ice=iceCycles*recipe.raw.ice!,body=colonyPlanet(w),here=nearestPlanet(w.ship.position,w.system).id===body.id;
 const needed=Math.max(0,fuelCapacity(w.ship)-w.ship.fuel),transfer=here&&w.ship.state==='landed'&&w.playerMode==='ship'?Math.min(needed,w.colony.products.fuel):0;
 const working=(kind:string)=>w.colony.buildings.some(b=>b.kind===kind&&operational(b)&&b.enabled);
 return {valid,error:valid?null:'Enter a finite fuel amount from 0 to 1000 kg',cycles,output:cycles*FUEL_RECIPE.output.fuel!,water,oxygen,missingWater,missingOxygen,iceCycles,ice,iceToDeliver:Math.max(0,ice-w.depot.ice),fuelWork:cycles*FUEL_RECIPE.seconds,iceWork:iceCycles*recipe.seconds,energy:cycles*FUEL_RECIPE.seconds*FUEL_RECIPE.power+iceCycles*recipe.seconds*recipe.power,
  concurrentPower:cycles>0?FUEL_RECIPE.power+(iceCycles>0?recipe.power:0):0,processor:working('fuelProcessor'),refinery:working('refinery'),body:body.id,label:body.label,here,needed,transfer,stock:w.colony.products.fuel,usableEnergy:Math.max(0,w.colony.energy-policyFor(w.colony).energyReserve)};
}
