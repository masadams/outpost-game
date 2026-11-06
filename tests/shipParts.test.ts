import { expect,it } from 'vitest';
import { createWorld,stepWorld } from '../src/sim/world';
import { applyEquipment,equipmentError } from '../src/sim/equipment';
import { UPGRADES,UPGRADE_IDS,TECHNOLOGIES,TECH_IDS,PART_SLOTS,BASE_UPGRADE_IDS,type UpgradeId } from '../src/sim/progressionConfig';
import { engineStats,cargoCapacity,fuelCapacity,miningStats,tractorStats,thermalStats,damageFactor } from '../src/sim/shipStats';
import { createShip,stepShip } from '../src/sim/physics';
import { shipMass } from '../src/sim/shipMass';
import { fireLaser,powerTractor,tractor } from '../src/sim/mining';
import { applyCombatAction,stepCombat } from '../src/sim/combat';
import { damageShip } from '../src/sim/combatProjectiles';
import { encodeCheckpoint,decodeCheckpoint } from '../src/persistence/checkpoint';
import { FixedClock } from '../src/sim/clock';
import { PRODUCTS } from '../src/sim/colonyConfig';
import { WORLD,STEP } from '../src/sim/config';
const shop=()=>{const w=createWorld();w.asteroids=[];w.exploration.sites=[];w.colony.research.completed=[...TECH_IDS];w.colony.products={alloy:100,wire:100,components:100,water:0,oxygen:0,fuel:0};w.colony.energy=20;return w;};
const fit=(w:ReturnType<typeof shop>,id:UpgradeId)=>{w.colony.energy=20;applyEquipment(w,{type:'equipment',upgrade:id,operation:'install'});};
const starts=(w:ReturnType<typeof shop>)=>({ship:{...w.ship.position},suit:{...w.astronaut.position},rocks:new Map(),meteors:new Map()});
it('defines a complete acyclic research tree and material-funded alternatives per slot',()=>{
 expect(TECH_IDS).toHaveLength(19);expect(UPGRADE_IDS).toHaveLength(25);
 for(const [index,id]of TECH_IDS.entries()){
  const spec=TECHNOLOGIES[id];expect(spec.seconds).toBeGreaterThan(0);expect(UPGRADE_IDS.some(part=>UPGRADES[part].tech===id)||!!spec.facilityTier).toBe(true);
  for(const requirement of spec.requires)expect(TECH_IDS.indexOf(requirement)).toBeLessThan(index);
 }
 for(const slot of PART_SLOTS)expect(UPGRADE_IDS.filter(id=>UPGRADES[id].slot===slot).length).toBeGreaterThanOrEqual(2);
 for(const id of UPGRADE_IDS)expect(Object.values(UPGRADES[id].cost).reduce((sum,n)=>sum+n,0)).toBe(UPGRADES[id].mass);
});
it.each(PART_SLOTS)('replaces the %s part atomically with paid mass and hull-scaled salvage without refills',slot=>{
 const w=shop(),old=UPGRADE_IDS.find(id=>UPGRADES[id].slot===slot)!,next=UPGRADE_IDS.find(id=>UPGRADES[id].slot===slot&&id!==old)!;
 fit(w,old);w.ship.hull=60;w.ship.armament.energy=33;w.ship.armament.heat=17;const mass=shipMass(w.ship),stock={...w.colony.products},fuel=w.ship.fuel;fit(w,next);
 expect(w.ship.equipment).toEqual([next]);expect(shipMass(w.ship)-mass).toBeCloseTo(UPGRADES[next].mass-UPGRADES[old].mass);expect(w.ship.hull).toBe(60);expect(w.ship.fuel).toBe(fuel);expect(w.ship.armament).toMatchObject({energy:33,heat:17});
 for(const p of PRODUCTS)expect(w.colony.products[p]).toBeCloseTo(stock[p]-(UPGRADES[next].cost[p]??0)+(UPGRADES[old].cost[p]??0)*.3);
 const after={...w.colony.products};applyEquipment(w,{type:'equipment',upgrade:next,operation:'install'});expect(w.colony.products).toEqual(after);expect(w.ship.equipment).toEqual([next]);
});
it('requires the full new cost before salvage and leaves a failed fit untouched',()=>{
 const w=shop();fit(w,'engine');w.colony.energy=20;w.colony.products.alloy=11;const before=structuredClone(w);
 expect(equipmentError(w,'efficientEngine','install')).toContain('full cost');applyEquipment(w,{type:'equipment',upgrade:'efficientEngine',operation:'install'});
 expect(w.ship).toEqual(before.ship);expect(w.colony).toEqual(before.colony);
});
it('blocks unsafe tank/hold downgrades and returns real excess fuel exactly once',()=>{
 const w=shop();fit(w,'surveyTank');w.ship.fuel=400;w.colony.products.fuel=30;w.colony.energy=20;const before=structuredClone(w);
 applyEquipment(w,{type:'equipment',upgrade:'tank',operation:'install'});expect(w.ship).toEqual(before.ship);expect(w.colony).toEqual(before.colony);
 w.colony.products.fuel=20;fit(w,'tank');expect(w.ship.fuel).toBe(320);expect(w.colony.products.fuel).toBe(100);expect(w.ship.fuel+w.colony.products.fuel).toBe(420);
 const h=shop();fit(h,'bulkHold');h.ship.cargo.iron=210;h.colony.energy=20;const held=structuredClone(h);applyEquipment(h,{type:'equipment',upgrade:'cargo',operation:'install'});expect(h.ship).toEqual(held.ship);expect(h.colony).toEqual(held.colony);
 h.ship.cargo.iron=200;fit(h,'cargo');expect(h.ship.equipment).toEqual(['cargo']);expect(h.ship.cargo.iron).toBe(200);
});
it('gives the orbital drive lower peak acceleration than high thrust but better actual burn efficiency',()=>{
 const ships=[createShip(),createShip()];ships[0].equipment=['engine'];ships[1].equipment=['efficientEngine'];
 for(const s of ships){s.state='flying';s.position.y=-4000;stepShip(s,{thrust:true,turn:0},1);}
 expect(ships[0].fuel).toBeCloseTo(238.96);expect(ships[1].fuel).toBeCloseTo(239.36);expect(ships[0].velocity.y).toBeLessThan(ships[1].velocity.y);
 expect(engineStats(ships[1]).thrust/engineStats(ships[1]).burn).toBeGreaterThan(engineStats(ships[0]).thrust/engineStats(ships[0]).burn);
 const fuel=ships[1].fuel;stepShip(ships[1],{thrust:false,turn:0},STEP);expect(ships[1].fuel).toBe(fuel);
});
it('uses advanced capacities without granting fuel or raw cargo',()=>{
 const w=shop();fit(w,'surveyTank');fit(w,'bulkHold');expect(fuelCapacity(w.ship)).toBe(400);expect(cargoCapacity(w.ship)).toBe(300);expect(w.ship.fuel).toBe(240);expect(w.ship.cargo.iron).toBe(0);
});
it('pays deep-mining draw/heat and reaches farther, stopping on insufficient cell power',()=>{
 const s=createShip();s.equipment=['deepMining'];s.state='flying';s.position.y=-4000;s.armament.energy=10;
 const rock={id:99,position:{x:0,y:-4600},velocity:{x:0,y:0},radius:10,mass:20,resource:'iron' as const,health:1,maxHealth:1,stage:0};
 expect(fireLaser(s,[rock],.1)?.targetId).toBe(99);expect(rock.health).toBeCloseTo(.8);expect(s.armament.energy).toBeCloseTo(9);expect(s.armament.heat).toBeCloseTo(.8);
 s.armament.energy=.5;expect(fireLaser(s,[rock],.1)).toBeNull();expect(rock.health).toBeCloseTo(.8);expect(miningStats(s).range).toBe(650);
});
it('pays the precision field once and conserves the actual coupled pickup/ship momentum',()=>{
 const s=createShip();s.equipment=['precisionTractor'];s.state='flying';s.position.y=-4000;s.armament.energy=10;const mass=shipMass(s);
 const p={id:99,position:{x:400,y:-4000},velocity:{x:0,y:0},radius:2,mass:2,resource:'iron' as const};expect(powerTractor(s,.1)).toBe(true);tractor(s,p,.1);
 expect(s.armament.energy).toBeCloseTo(9.4);expect(s.armament.heat).toBeCloseTo(.4);expect(p.velocity.x).toBeCloseTo(-2.2);expect(s.velocity.x*mass+p.velocity.x*p.mass).toBeCloseTo(0);expect(tractorStats(s).range).toBe(430);
});
it('snapshots heavy cannon damage and pays its cell/heat/ammunition cost',()=>{
 const w=shop();fit(w,'heavyCoil');w.ship.state='flying';w.ship.position.y=-4000;stepCombat(w,true,STEP,starts(w));
 expect(w.combat.projectiles[0].damage).toBe(30);expect(w.ship.armament).toMatchObject({energy:84,heat:28,cannon:39});
 w.ship.equipment=[];expect(decodeCheckpoint(encodeCheckpoint(w)).combat.projectiles[0].damage).toBe(30);
});
it('trades cell recharge for stronger cooling and preserves fatal landing rules with layered armour',()=>{
 const w=shop();fit(w,'cryoCooling');fit(w,'layeredArmour');w.ship.armament.heat=70;w.ship.armament.energy=0;stepCombat(w,false,1,starts(w));
 expect(w.ship.armament.heat).toBe(30);expect(w.ship.armament.energy).toBe(6);w.ship.hull=40;damageShip(w,10);expect(w.ship.hull).toBeCloseTo(33.5);expect(damageFactor(w.ship)).toBe(.65);expect(thermalStats(w.ship).cooling).toBe(40);
 const s=createShip();s.equipment=['layeredArmour'];s.state='flying';s.position.y=-WORLD.radius-WORLD.shipRadius-.1;s.velocity.y=40;stepShip(s,{thrust:false,turn:0},STEP);expect(s.state).toBe('crashed');
});
it('persists exclusive advanced parts, rejects duplicate slots/prerequisite skips, and retains paid parts on recovery',()=>{
 const w=shop();fit(w,'efficientEngine');fit(w,'surveyTank');expect(decodeCheckpoint(encodeCheckpoint(w)).ship.equipment).toEqual(w.ship.equipment);
 for(const mutate of [(x:any)=>x.world.ship.equipment=['engine','efficientEngine'],(x:any)=>x.world.colony.research.completed=['materials','orbital'],(x:any)=>x.world.ship.fuel=401]){const saved=JSON.parse(encodeCheckpoint(w));mutate(saved);expect(()=>decodeCheckpoint(JSON.stringify(saved))).toThrow();}
 w.ship.state='crashed';w.ship.fuel=300;applyCombatAction(w,{type:'recoverShip'});expect(w.ship.equipment).toEqual([]);expect(w.wrecks[0].ship.equipment).toEqual(['efficientEngine','surveyTank']);expect(w.ship.hull).toBe(100);
});
it('has identical advanced flight/tool outcomes at 30 and 144 renderer frames per second',()=>{
 const runs=[30,144].map(fps=>{const w=shop(),clock=new FixedClock();w.ship.equipment=PART_SLOTS.map(slot=>UPGRADE_IDS.filter(id=>UPGRADES[id].slot===slot).at(-1)!);for(let i=0;i<fps*4;i++)clock.advance(1/fps,dt=>stepWorld(w,{thrust:true,turn:0,mine:true,tractor:true},dt));return w;});
 expect(runs[0]).toEqual(runs[1]);
});
it('uses the ion drive in actual thrust/fuel integration and blocks a loaded lightweight downgrade',()=>{
 const s=createShip();s.equipment=['ionDrive'];s.state='flying';s.position.y=-4000;stepShip(s,{thrust:true,turn:0},1);expect(s.fuel).toBeCloseTo(239.6);expect(engineStats(s).thrust).toBe(12600);
 const w=shop();fit(w,'bulkHold');w.ship.cargo.iron=221;w.colony.energy=20;const stock={...w.colony.products};applyEquipment(w,{type:'equipment',upgrade:'lightHold',operation:'install'});expect(w.ship.equipment).toEqual(['bulkHold']);expect(w.colony.products).toEqual(stock);w.ship.cargo.iron=220;fit(w,'lightHold');expect(cargoCapacity(w.ship)).toBe(220);expect(w.ship.cargo.iron).toBe(220);
});
it('pays industrial mining and tractor loads with the advertised short reach and actual momentum exchange',()=>{
 const s=createShip();s.equipment=['stripMiner'];s.state='flying';s.position.y=-4000;s.armament.energy=20;
 const rock={id:99,position:{x:0,y:-4300},velocity:{x:0,y:0},radius:10,mass:20,resource:'iron' as const,health:1,maxHealth:1,stage:0};
 fireLaser(s,[rock],.1);expect(rock.health).toBeCloseTo(.74);expect(s.armament.energy).toBeCloseTo(18.6);expect(s.armament.heat).toBeCloseTo(1.2);rock.position.y=-4400;expect(fireLaser(s,[rock],.1)?.targetId).toBeNull();
 s.equipment=['broadTractor'];const mass=shipMass(s),energy=s.armament.energy,heat=s.armament.heat;const p={id:100,position:{x:300,y:-4000},velocity:{x:0,y:0},radius:2,mass:2,resource:'iron' as const};expect(powerTractor(s,.1)).toBe(true);tractor(s,p,.1);expect(s.armament.energy).toBeCloseTo(energy-.9);expect(s.armament.heat).toBeCloseTo(heat+.7);expect(p.velocity.x).toBeCloseTo(-4.2);expect(s.velocity.x*mass+p.velocity.x*p.mass).toBeCloseTo(0);
});
it('runs the efficient coil and recharge-focused cooling loop through actual combat stepping',()=>{
 const w=shop();fit(w,'efficientCoil');fit(w,'capacitorCooler');w.ship.state='flying';w.ship.position.y=-4000;stepCombat(w,true,STEP,starts(w));expect(w.combat.projectiles[0].damage).toBe(21);expect(w.ship.armament).toMatchObject({energy:94,heat:12,cannon:39});w.ship.armament.energy=0;w.ship.armament.heat=70;stepCombat(w,false,1,starts(w));expect(w.ship.armament.energy).toBe(16);expect(w.ship.armament.heat).toBe(46);expect(decodeCheckpoint(encodeCheckpoint(w)).ship.equipment).toEqual(['efficientCoil','capacitorCooler']);
});
