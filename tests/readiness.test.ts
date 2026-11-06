import { expect,it } from 'vitest';
import { createWorld,stepWorld } from '../src/sim/world';
import { recoveryReadiness,fuelPlan } from '../src/sim/readiness';
import { colonyWorld } from '../src/sim/localWorld';
import { planetAt,surfacePosition } from '../src/sim/celestial';
import { starterPlan } from '../src/sim/starterPlan';
import { applyCommandAction } from '../src/sim/command';
import { applyCombatAction } from '../src/sim/combat';
import { serviceCombatAtPad } from '../src/sim/combatSupply';
import { refuelShip } from '../src/sim/colonyService';
import { applyFacilityAction } from '../src/sim/colony';
import { RECOVERY } from '../src/sim/combatConfig';
const tick=(w:ReturnType<typeof createWorld>,seconds:number)=>{for(let i=0;i<seconds*60;i++)stepWorld(w,{thrust:false,turn:0},1/60);};
it('quotes the real home recovery bill without reserving, transferring or pooling remote stock',()=>{
 const w=createWorld(),before=structuredClone(w);expect(recoveryReadiness(colonyWorld(w,'moon'))).toMatchObject({funded:true,canRecover:false,hull:30,fuel:20});expect(w).toEqual(before);
 w.colony.products.alloy=1;w.colony.products.components=1;w.outposts.moon.colony.products.alloy=w.outposts.moon.colony.products.components=100;
 const plan=recoveryReadiness(colonyWorld(w,'moon'));expect(plan.funded).toBe(false);expect(plan.rows.map(r=>r.shortfall)).toEqual([7,1]);
});
it('distinguishes protected material from usable stock and prices repair/rearm separately',()=>{
 const w=createWorld();w.ship.state='crashed';w.ship.fuel=3;w.ship.cargo.iron=7;w.ship.armament.cannon=0;w.ship.armament.missile=0;w.colony.policy={energyReserve:0,deliveryReserve:0,alloyReserve:24,componentsReserve:0};
 const plan=recoveryReadiness(w);expect(plan).toMatchObject({funded:false,canRecover:false,fuel:3,lostCargo:7,repairAlloy:7,rearmAlloy:6,rearmComponents:.5});expect(plan.rows[0]).toMatchObject({stock:28,usable:4,shortfall:4});
});
it('optionally includes spares once in the starter bill as a read-only allowance',()=>{
 const w=createWorld(),before=structuredClone(w),normal=starterPlan(w),spares=starterPlan(w,true);
 expect(spares.required.alloy-normal.required.alloy).toBe(RECOVERY.cost.alloy);expect(spares.required.components-normal.required.components).toBe(RECOVERY.cost.components);expect(spares.rows.find(r=>r.product==='alloy')!.shortfall).toBe(6);expect(w).toEqual(before);
});
it('plans whole fuel cycles and shared ice co-products without charging ice twice',()=>{
 const w=createWorld(),before=structuredClone(w),plan=fuelPlan(w,20);
 expect(plan).toMatchObject({valid:true,cycles:16,output:20,water:16,oxygen:4,missingWater:12,missingOxygen:2,iceCycles:18,ice:18,iceToDeliver:18,fuelWork:48,iceWork:36,energy:432,concurrentPower:10});expect(w).toEqual(before);
 w.colony.products.water=w.colony.products.oxygen=0;expect(fuelPlan(w,20).iceCycles).toBe(23);expect(fuelPlan(w,1)).toMatchObject({cycles:1,output:1.25});expect(fuelPlan(w,0)).toMatchObject({cycles:0,output:0,energy:0,concurrentPower:0});
});
it.each([NaN,Infinity,-1,1001])('rejects invalid production requests %s without touching the world',value=>{
 const w=createWorld(),before=structuredClone(w);expect(fuelPlan(w,value)).toMatchObject({valid:false,cycles:0});expect(w).toEqual(before);
});
it('quotes only the selected world fuel/ice and allows no remote or airborne transfer',()=>{
 const w=createWorld(),moon=colonyWorld(w,'moon'),p=planetAt('moon',w.system);w.colony.products.fuel=100;w.depot.ice=100;moon.colony.products.fuel=2;moon.depot.ice=3;w.ship.position=surfacePosition(p,0,7);w.ship.velocity={...p.velocity};w.ship.ground='moon';w.ship.fuel=230;
 expect(fuelPlan(moon,20)).toMatchObject({label:'Nacre',stock:2,transfer:2,ice:23,iceToDeliver:20});
 w.ship.state='flying';expect(fuelPlan(moon,20).transfer).toBe(0);w.ship.state='landed';w.playerMode='astronaut';expect(fuelPlan(moon,20).transfer).toBe(0);expect(fuelPlan(w,20).here).toBe(false);expect(fuelPlan(w,20).transfer).toBe(0);
});
it('constructs supplied industry, pays recovery/repair and manufactures finite fuel with conserved fluid mass',()=>{
 const w=createWorld();w.asteroids=[];w.exploration.sites=[];w.playerMode='astronaut';const p=planetAt('home',w.system);w.astronaut.position=surfacePosition(p,120/p.radius,2.5);w.astronaut.velocity={...p.velocity};w.depot.iron=10;w.depot.ice=30;
 for(const [kind,metres]of [['solar',120],['refinery',160],['fuelProcessor',200],['service',76]] as const)applyCommandAction(w,{type:'queueBuild',kind,angle:metres/p.radius});
 tick(w,45);expect(w.colony.buildings).toHaveLength(4);expect(w.colony.products.alloy).toBe(18);expect(w.colony.products.fuel).toBeCloseTo(5);w.ship.state='crashed';w.ship.hull=0;w.ship.fuel=0;
 expect(recoveryReadiness(w).canRecover).toBe(true);applyCombatAction(w,{type:'recoverShip'});expect(w.ship.hull).toBe(100);expect(w.wrecks).toHaveLength(1);expect(w.colony.products).toMatchObject({alloy:10,components:2});
 // The rest checks service and refuelling, from a battered, empty lander.
 w.ship.hull=30;w.ship.fuel=0;serviceCombatAtPad(w);expect(w.ship.hull).toBe(100);expect(w.colony.products.alloy).toBe(3);expect(refuelShip(w,w.ship.position)).toBeCloseTo(5);
 const refinery=w.colony.buildings.find(b=>b.kind==='refinery')!;for(let i=0;i<3;i++)applyFacilityAction(w,refinery,{type:'cycleRecipe'});tick(w,180);refuelShip(w,w.ship.position);
 expect(w.depot.ice).toBe(0);expect(w.ship.fuel).toBeCloseTo(31.25);expect(w.colony.products.fuel).toBe(0);expect(w.colony.products.water).toBeCloseTo(0);expect(w.colony.products.oxygen).toBeCloseTo(4.75);expect(w.ship.fuel+w.colony.products.water+w.colony.products.oxygen).toBeCloseTo(36);expect(w.defence.wave).toBe(0);
});

it('matches the recovery executor exactly when stock is fractionally below its price',()=>{
 const w=createWorld();w.ship.state='crashed';w.ship.hull=0;w.colony.products.alloy=RECOVERY.cost.alloy-1e-10;
 expect(recoveryReadiness(w).funded).toBe(false);expect(recoveryReadiness(w).canRecover).toBe(false);
 const stock={...w.colony.products};applyCombatAction(w,{type:'recoverShip'});expect(w.combat.recoveries).toBe(0);expect(w.colony.products).toEqual(stock);
});
