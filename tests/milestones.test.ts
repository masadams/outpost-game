import { expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { starterPlan } from '../src/sim/starterPlan';
import { objectiveProgress, observeObjectives } from '../src/sim/objectives';
import { applyCommandAction } from '../src/sim/command';
import { applyResearch } from '../src/sim/research';
import { applyEquipment } from '../src/sim/equipment';
import { applyCrewOrder } from '../src/sim/crewOrders';
import { completedBuilding } from '../src/sim/construction';
import { colonyWorld } from '../src/sim/localWorld';
import { planetAt, surfacePosition, type BodyId } from '../src/sim/celestial';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';
import { PRODUCTS } from '../src/sim/colonyConfig';
import { TECH_IDS, TECHNOLOGIES } from '../src/sim/progressionConfig';
import { FixedClock } from '../src/sim/clock';

const tick = (w:ReturnType<typeof createWorld>,seconds:number) => { for(let i=0;i<Math.round(seconds*60);i++)stepWorld(w,{thrust:false,turn:0},1/60); };
function worker(body:BodyId='home') {
 const w=createWorld();w.asteroids=[];w.exploration.sites=[];w.playerMode='astronaut';
 const p=planetAt(body,w.system);w.astronaut.position=surfacePosition(p,120/p.radius,2.5);w.astronaut.velocity={...p.velocity};
 if(body==='moon')for(const product of PRODUCTS){w.moon.colony.products[product]=w.colony.products[product];w.colony.products[product]=0;}
 return w;
}
function supplied(body:BodyId='home') {
 const w=worker(body),site=colonyWorld(w,body),p=planetAt(body,w.system);
 applyCommandAction(site,{type:'queueBuild',kind:'solar',angle:200/p.radius});
 applyCommandAction(site,{type:'queueBuild',kind:'habitatSmall',angle:120/p.radius});
 tick(w,18);expect(site.colony.buildings).toHaveLength(2);return w;
}
it('derives a finite starter bill from actual costs and reads without mutating or pooling worlds',()=>{
 const w=createWorld(),before=structuredClone(w),plan=starterPlan(colonyWorld(w,'moon'));
 expect(plan.required).toMatchObject({alloy:26,wire:11,components:6});expect(plan.rows.every(r=>r.shortfall===0)).toBe(true);
 expect(plan).toMatchObject({researchEnergy:60,fabricationEnergy:20,usableEnergy:0});expect(w).toEqual(before);
 w.colony.products.alloy=0;w.moon.colony.products.alloy=100;w.ship.freight.alloy=20;
 expect(starterPlan(w).rows.find(r=>r.product==='alloy')).toMatchObject({usable:0,shortfall:26});
});
it('accounts for committed work and research once, then restores the bill on cancellation',()=>{
 const w=createWorld();applyCommandAction(w,{type:'queueBuild',kind:'solar',angle:200/1800});
 expect(starterPlan(w).required.alloy).toBe(22);expect(starterPlan(w).pending).toContain('Solar array: paid work queued');
 applyResearch(w,{type:'researchStart',tech:'materials'});w.colony.research.queue[0].progress=5;
 expect(starterPlan(w)).toMatchObject({researchEnergy:40});expect(starterPlan(w).required.alloy).toBe(18);
 applyCommandAction(w,{type:'queueControl',id:1,operation:'cancel'});expect(starterPlan(w).required.alloy).toBe(22);
});
it('shows reserved material shortfalls and exact refining inputs, with local raw stock separately',()=>{
 const w=createWorld();w.colony.policy={energyReserve:5,deliveryReserve:0,alloyReserve:10,componentsReserve:5};w.colony.energy=20;w.depot.iron=2;
 const plan=starterPlan(w);expect(plan.rows.find(r=>r.product==='alloy')).toMatchObject({usable:18,shortfall:8});
 expect(plan.rows.find(r=>r.product==='components')).toMatchObject({usable:3,shortfall:3});
 expect(plan.raw.find(r=>r.resource==='iron')).toEqual({resource:'iron',need:8,inDepot:2,shortfall:6});
 expect(plan.raw.find(r=>r.resource==='silicon')!.need).toBeCloseTo(2.7);expect(plan.raw.find(r=>r.resource==='rareMetals')!.need).toBeCloseTo(.3);expect(plan.usableEnergy).toBe(15);
});
it('distinguishes intact disabled facilities, wrecks and completed research/equipment',()=>{
 const w=createWorld();const b=completedBuilding(1,'solar',200/1800,w);b.enabled=false;w.colony.buildings.push(b);w.colony.nextId=2;
 expect(starterPlan(w).missing).not.toContain('Solar array');b.health=0;expect(starterPlan(w).missing).toContain('Solar array');
 w.colony.research.completed=['materials'];w.ship.equipment=['cargo'];const plan=starterPlan(w);
 expect(plan.missing).not.toContain('Research lab');expect(plan.missing).not.toContain('Cargo rack');expect(plan.researchEnergy).toBe(0);expect(plan.fabricationEnergy).toBe(0);
});
it.each(['home','moon'] as const)('records paid breathable work on %s, caps progress and never grants stock',body=>{
 const w=supplied(body),site=colonyWorld(w,body),before={...site.colony.products},air=w.astronaut.oxygen;
 tick(w,25);expect(w.objectives.habitatSeconds).toBe(20);expect(w.objectives.completed).toContain('habitat');expect(w.astronaut.oxygen).toBeCloseTo(air);
 expect(site.colony.products.oxygen).toBeLessThan(before.oxygen);expect(site.colony.products.alloy).toBe(14);expect(w.defence.wave).toBe(0);expect(w.combat.encounters).toBe(0);
});
it.each(['disabled','empty','no power','outside'] as const)('stops supplied-air progress when %s and keeps suit risk',failure=>{
 const w=supplied(),b=w.colony.buildings.find(b=>b.habitat)!,h=b.habitat!;
 if(failure==='disabled')b.enabled=false;
 if(failure==='empty'){h.oxygen=0;w.colony.products.oxygen=0;}
 if(failure==='no power'){w.colony.buildings[0].enabled=false;w.colony.energy=0;h.energy=0;h.powered=false;}
 if(failure==='outside'){const p=planetAt('home',w.system);w.astronaut.position=surfacePosition(p,160/p.radius,2.5);}
 const progress=w.objectives.habitatSeconds,air=w.astronaut.oxygen;tick(w,2);
 expect(w.objectives.habitatSeconds).toBe(progress);expect(w.astronaut.oxygen).toBeLessThan(air);expect(w.objectives.completed).not.toContain('habitat');
});
it('preserves active milestone progress through current saves and rejects malformed counters or claims',()=>{
 const w=supplied();tick(w,5);const loaded=decodeCheckpoint(encodeCheckpoint(w));tick(w,10);tick(loaded,10);expect(loaded.objectives).toEqual(w.objectives);expect(loaded.astronaut.oxygen).toBe(w.astronaut.oxygen);
 for(const fields of [{habitatSeconds:-1},{habitatSeconds:21},{habitatSeconds:null},{completed:['habitat'],habitatSeconds:0},{completed:['research','research']}]){const save=JSON.parse(encodeCheckpoint(w));Object.assign(save.world.objectives,fields);expect(()=>decodeCheckpoint(JSON.stringify(save))).toThrow();}
});
it('records research/interception results rather than starting drills or issuing rewards',()=>{
 const w=createWorld(),before=structuredClone(w);observeObjectives(w);expect(w).toEqual(before);
 w.colony.research.completed=['materials','propulsion','extraction'];observeObjectives(w);expect(objectiveProgress(w,'research')).toMatchObject({value:3,target:TECH_IDS.length});expect(w.objectives.completed).not.toContain('research');
 w.colony.research.completed.push('combat');observeObjectives(w);expect(w.objectives.completed).not.toContain('research');w.colony.research.completed=[...TECH_IDS];w.defence.intercepted=1;observeObjectives(w);expect(w.objectives.completed).toEqual(['research','defence']);expect(w.defence.wave).toBe(0);expect(w.colony.products).toEqual(before.colony.products);
});
it('funds the advertised home route with the finite kit and real powered research, then installs at home',()=>{
 const w=worker();const p=planetAt('home',w.system);w.astronaut.position=surfacePosition(p,200/p.radius,2.5);
 for(const [kind,metres]of [['solar',200],['refinery',240],['researchLab',280]] as const)applyCommandAction(w,{type:'queueBuild',kind,angle:metres/p.radius});
 tick(w,25);expect(w.colony.buildings).toHaveLength(3);applyResearch(w,{type:'researchStart',tech:'materials'});tick(w,16);expect(w.colony.research.completed).toContain('materials');
 applyCrewOrder(w,{type:'crewOrder',operation:'walk',angle:0});tick(w,20);applyEquipment(w,{type:'equipment',upgrade:'cargo',operation:'install'});
 expect(w.ship.equipment).toEqual(['cargo']);expect(w.colony.products).toMatchObject({alloy:2,wire:3,components:2});expect(starterPlan(w).rows).toHaveLength(0);expect(w.colony.research.energyUsed).toBeCloseTo(60);expect(w.ship.fuel).toBe(240);
});
it('keeps actual habitat milestone work equal at 30 and 144 renderer frames per second',()=>{
 const base=supplied();const runs=[30,144].map(fps=>{const w=decodeCheckpoint(encodeCheckpoint(base)),clock=new FixedClock();for(let i=0;i<fps*22;i++)clock.advance(1/fps,dt=>stepWorld(w,{thrust:false,turn:0},dt));return w;});
 expect(runs[0].objectives).toEqual(runs[1].objectives);expect(runs[0].colony.products).toEqual(runs[1].colony.products);expect(runs[0].astronaut).toEqual(runs[1].astronaut);
});

it('rounds fractional material shortfalls up to real whole refinery cycles',()=>{
 const w=createWorld();w.colony.products.alloy=25.5;const plan=starterPlan(w);expect(plan.rows.find(r=>r.product==='alloy')!.shortfall).toBe(.5);expect(plan.raw.find(r=>r.resource==='iron')!.need).toBe(1);
});

it('records the research milestone only after all nineteen paid powered projects actually finish',()=>{
 const w=worker();w.colony.buildings=[completedBuilding(1,'storage',480/1800,w),completedBuilding(2,'storage',540/1800,w)];w.colony.nextId=3;w.colony.products.alloy=300;w.colony.products.wire=300;w.colony.products.components=300;
 applyCommandAction(w,{type:'queueBuild',kind:'solar',angle:200/1800});applyCommandAction(w,{type:'queueBuild',kind:'researchLab',angle:120/1800});tick(w,17);applyCrewOrder(w,{type:'crewOrder',operation:'walk',angle:0});tick(w,15);stepWorld(w,{thrust:false,turn:0,board:true},1/60);expect(w.playerMode).toBe('ship');
 for(const tech of TECH_IDS){
  applyResearch(w,{type:'researchStart',tech});expect(w.objectives.completed).not.toContain('research');tick(w,TECHNOLOGIES[tech].seconds+1);
 }
 expect(w.objectives.completed).toContain('research');expect(w.colony.research.energyUsed).toBeCloseTo(2920);expect(w.colony.products).toMatchObject({alloy:82,wire:181,components:233});expect(w.defence.wave).toBe(0);
});
