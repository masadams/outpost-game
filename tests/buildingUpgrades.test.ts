import {expect,it} from 'vitest';
import {createWorld,stepWorld} from '../src/sim/world';
import {completedBuilding} from '../src/sim/construction';
import {applyBuildingUpgrade,buildingUpgradeError} from '../src/sim/buildingUpgrades';
import {capacityFactor,workFactor,buildingCost} from '../src/sim/facilityStats';
import {TECH_IDS} from '../src/sim/progressionConfig';
import {applyColonyAction,stepColony,energyCapacity,oreCapacity,productCapacity} from '../src/sim/colony';
import {colonyWorld,sitePosition} from '../src/sim/localWorld';
import {damageColony,constrainDamagedStorage} from '../src/sim/buildingDamage';
import {stepMiningRig} from '../src/sim/surfaceExtraction';
import {stepResearch} from '../src/sim/research';
import {BUILD_TYPES,PRODUCTS,type BuildType} from '../src/sim/colonyConfig';
import {decodeCheckpoint,encodeCheckpoint} from '../src/persistence/checkpoint';
import {FixedClock} from '../src/sim/clock';
import {screenToWorld,worldToScreen} from '../src/render/pointer';
const fixture=(kind:BuildType='solar')=>{const w=createWorld();w.asteroids=[];w.colony.research.completed=[...TECH_IDS];w.colony.products.alloy=w.colony.products.wire=w.colony.products.components=80;w.colony.energy=20;const b=completedBuilding(1,kind,160/1800,w);w.colony.buildings=[b,completedBuilding(2,'battery',240/1800,w)];w.colony.nextId=3;return {w,b};};
it('gates each tier on research, full repair, local unreserved materials and grid energy atomically',()=>{
 const {w,b}=fixture();w.colony.research.completed=[];expect(buildingUpgradeError(w,b)).toContain('Infrastructure');
 w.colony.research.completed=[...TECH_IDS];b.health=99;expect(buildingUpgradeError(w,b)).toContain('Repair');b.health=100;w.colony.products.alloy=0;expect(buildingUpgradeError(w,b)).toContain('materials');w.colony.products.alloy=80;w.colony.policy={alloyReserve:80,componentsReserve:0,deliveryReserve:0,energyReserve:0};expect(buildingUpgradeError(w,b)).toContain('materials');w.colony.policy.alloyReserve=0;w.colony.energy=19;expect(buildingUpgradeError(w,b)).toContain('20 kJ');
 const before=structuredClone(w.colony);applyBuildingUpgrade(w,{type:'upgradeBuilding',id:1,level:2});expect(w.colony).toEqual(before);w.colony.energy=20;applyBuildingUpgrade(w,{type:'upgradeBuilding',id:1,level:2});expect(b.level).toBe(2);expect(w.colony.energy).toBe(0);expect(w.colony.products).toMatchObject({alloy:76,wire:78,components:79});
 w.colony.research.completed=w.colony.research.completed.filter(t=>t!=='industrialSystems');expect(buildingUpgradeError(w,b)).toContain('Advanced');w.colony.research.completed=[...TECH_IDS];w.colony.energy=40;applyBuildingUpgrade(w,{type:'upgradeBuilding',id:1,level:3});expect(b.level).toBe(3);expect(w.colony.products).toMatchObject({alloy:68,wire:74,components:77});const after=structuredClone(w.colony);applyBuildingUpgrade(w,{type:'upgradeBuilding',id:1,level:2});expect(w.colony).toEqual(after);
});
it.each(BUILD_TYPES)('upgrades %s in place, preserving every existing field and real contents',kind=>{
 const {w,b}=fixture(kind);b.progress=.7;b.enabled=false;b.dispatch={rank:4,limit:50};const before=structuredClone(b),products={...w.colony.products},depot={...w.depot};applyBuildingUpgrade(w,{type:'upgradeBuilding',id:1,level:2});expect(b).toEqual({...before,level:2});expect(w.depot).toEqual(depot);for(const p of PRODUCTS)expect(w.colony.products[p]).toBeLessThanOrEqual(products[p]);expect(w.colony.energy).toBe(0);
});
it('expands storage/battery capacity empty, increases paid generation, and removes wrecked capacity',()=>{
 const {w,b}=fixture('storage');const initial={products:{...w.colony.products},depot:{...w.depot}},ore=oreCapacity(w.colony),products=productCapacity(w.colony);applyBuildingUpgrade(w,{type:'upgradeBuilding',id:1,level:2});expect(oreCapacity(w.colony)-ore).toBe(125);expect(productCapacity(w.colony)-products).toBe(62.5);expect(w.depot).toEqual(initial.depot);
 w.colony.energy=20;applyBuildingUpgrade(w,{type:'upgradeBuilding',id:2,level:2});expect(energyCapacity(w.colony)).toBe(1820);expect(w.colony.energy).toBe(0);
 w.colony.products.alloy=240;w.depot.iron=690;b.health=0;constrainDamagedStorage(w);expect(w.depot.iron).toBe(400);expect(w.colony.products.alloy).toBe(100);expect(w.defence.lostStock).toBe(430);
 const solar=fixture();applyBuildingUpgrade(solar.w,{type:'upgradeBuilding',id:1,level:2});stepColony(solar.w,1);expect(solar.w.colony.generation).toBeCloseTo(14.4, 6);expect(solar.w.colony.energy).toBeCloseTo(14.4, 6);
});
it('pays proportionally for faster finite extraction and shared research with no extra ore or energy creation',()=>{
 const {w,b}=fixture('miningRig');applyBuildingUpgrade(w,{type:'upgradeBuilding',id:1,level:2});w.colony.energy=100;const seam=w.surfaceDeposits[0].remaining;for(let i=0;i<120;i++)stepMiningRig(w,b,1/60,400);expect(w.depot.iron).toBe(.5);expect(w.surfaceDeposits[0].remaining+w.depot.iron).toBe(seam);expect(w.colony.energy).toBeCloseTo(85);expect(b.progress).toBeCloseTo(.5);expect(b.gridPower).toBe(7.5);
 const lab=fixture('researchLab');applyBuildingUpgrade(lab.w,{type:'upgradeBuilding',id:1,level:2});lab.w.colony.research.completed=[];lab.w.colony.research.queue=[{funding:'home',tech:'materials',progress:0,paused:false}];lab.w.colony.energy=100;for(let i=0;i<120;i++)stepResearch(lab.w,lab.b,1/60,false);expect(lab.w.colony.research.queue[0].progress).toBeCloseTo(2.5);expect(lab.w.colony.research.energyUsed).toBeCloseTo(10);expect(lab.w.colony.energy).toBeCloseTo(90);
});
it('accelerates recipes with proportional power while preserving mass per completed cycle',()=>{
 const {w,b}=fixture('refinery');applyBuildingUpgrade(w,{type:'upgradeBuilding',id:1,level:2});w.colony.energy=100;w.depot.iron=10;w.colony.products.alloy=0;for(let i=0;i<240;i++)stepColony(w,1/60);expect(w.depot.iron+w.colony.products.alloy).toBe(10);expect(w.colony.products.alloy).toBe(2);expect(w.colony.energy).toBeCloseTo(80);expect(b.progress).toBeCloseTo(1);expect(b.gridPower).toBe(5);
});
it('uses only the addressed colony inventory and does not change the other world',()=>{
 const {w}=fixture();const moon=colonyWorld(w,'moon');moon.colony.buildings=[completedBuilding(1001,'solar',.2,moon)];moon.colony.nextId=1002;const home=structuredClone(w.colony);applyBuildingUpgrade(moon,{type:'upgradeBuilding',id:1001,level:2});expect(moon.colony.buildings[0].level).toBeUndefined();expect(w.colony).toEqual(home);moon.colony.products.alloy=10;moon.colony.products.wire=10;moon.colony.products.components=10;moon.colony.energy=20;stepWorld(w,{thrust:false,turn:0,colonyActions:[{type:'upgradeBuilding',id:1001,level:2,body:'moon'}]},1/60);expect(moon.colony.buildings[0].level).toBe(2);expect(w.colony.products).toEqual(home.products);
});
it('scales structural damage and salvages only paid materials, once, at remaining hull fraction',()=>{
 const {w,b}=fixture();applyBuildingUpgrade(w,{type:'upgradeBuilding',id:1,level:2});damageColony(w,sitePosition(w,b.angle,0),10,10);expect(b.health).toBeCloseTo(91.5);expect(buildingCost(b)).toMatchObject({alloy:8,wire:4});
 w.playerMode='astronaut';w.astronaut.grounded=true;w.astronaut.position=sitePosition(w,b.angle);w.colony.buildOpen=true;const before={...w.colony.products};applyColonyAction(w,{type:'demolish'});expect(w.colony.buildings.some(x=>x.id===1)).toBe(false);expect(w.colony.products.alloy-before.alloy).toBeCloseTo(8*.75*.915);const after={...w.colony.products};applyColonyAction(w,{type:'demolish'});expect(w.colony.products).toEqual(after);
});
it('persists paid levels, rejects invalid/unearned tiers, and keeps simulation independent of renderer Hz',()=>{
 const {w,b}=fixture('solar');applyBuildingUpgrade(w,{type:'upgradeBuilding',id:1,level:2});expect(decodeCheckpoint(encodeCheckpoint(w)).colony.buildings[0]).toEqual(b);
 for(const level of [-1,0,4,2.5,'2',null]){const saved=JSON.parse(encodeCheckpoint(w));saved.world.colony.buildings[0].level=level;expect(()=>decodeCheckpoint(JSON.stringify(saved))).toThrow();}
 const saved=JSON.parse(encodeCheckpoint(w));saved.world.colony.research.completed=[];expect(()=>decodeCheckpoint(JSON.stringify(saved))).toThrow();
 const runs=[30,144].map(fps=>{const x=decodeCheckpoint(encodeCheckpoint(w)),clock=new FixedClock();for(let i=0;i<fps*5;i++)clock.advance(1/fps,dt=>stepWorld(x,{thrust:false,turn:0},dt));return x;});expect(runs[0]).toEqual(runs[1]);
});
it('projects physical labels back to exactly the same world point through camera rotation/zoom',()=>{
 for(const angle of [-2,0,1.2])for(const zoom of [.05,1.7,3]){const view={x:4000,y:-2000,angle,zoom,width:1280,height:800},p={x:-42,y:9000};const actual=screenToWorld(worldToScreen(p,view),view);expect(actual.x).toBeCloseTo(p.x);expect(actual.y).toBeCloseTo(p.y);}
});

it('never buys a higher tier from duplicated stale requests, but accepts a fresh explicit tier purchase',()=>{
 const {w,b}=fixture();w.colony.energy=100;const action={type:'upgradeBuilding',id:1,level:2} as const;stepWorld(w,{thrust:false,turn:0,colonyActions:[action,action]},1/60);expect(b.level).toBe(2);expect(w.colony.products).toMatchObject({alloy:76,wire:78,components:79});expect(w.colony.energy).toBeGreaterThanOrEqual(80);stepWorld(w,{thrust:false,turn:0,colonyActions:[{type:'upgradeBuilding',id:1,level:3}]},1/60);expect(b.level).toBe(3);expect(w.colony.products).toMatchObject({alloy:68,wire:74,components:77});
});

it('clamps an accepted floating-point charge boundary to zero so the upgraded world remains saveable',()=>{
 const {w,b}=fixture();w.colony.energy=20-5e-10;applyBuildingUpgrade(w,{type:'upgradeBuilding',id:1,level:2});expect(b.level).toBe(2);expect(w.colony.energy).toBe(0);expect(()=>encodeCheckpoint(w)).not.toThrow();
});
