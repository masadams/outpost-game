import { VisualEffects } from '../src/render/effects';
import { expect, it } from 'vitest';
import { bindingError, defaultPresentation, parsePresentation, controlHint } from '../src/preferences/presentation';
import { createWorld, stepWorld } from '../src/sim/world';
import { loadManifest, manifestPlan, MANIFESTS } from '../src/sim/manifests';
import { colonyWorld } from '../src/sim/localWorld';
import { cargoMass, shipMass } from '../src/sim/shipMass';
import { observeObjectives } from '../src/sim/objectives';
import { planetAt, surfacePosition } from '../src/sim/celestial';
import { encodeCheckpoint, decodeCheckpoint } from '../src/persistence/checkpoint';
import { RenderBudget, visible } from '../src/render/budget';
import { completedBuilding } from '../src/sim/construction';

it('validates persisted presentation preferences and conflicts without changing the world',()=>{
 const p=defaultPresentation(true);p.bindings.W='S';p.textScale=1.5;p.musicVolume=.4;
 expect(parsePresentation(JSON.stringify(p))).toEqual(p);
 for(const change of [{textScale:99},{effectsVolume:-1},{musicVolume:'1'},{bindings:{W:'P'}},{bindings:{W:'__proto__'}},{bindings:[]},{bindings:{UNKNOWN:'S'}}])expect(parsePresentation(JSON.stringify({...p,...change}),true)).toEqual(defaultPresentation(true));
 expect(bindingError({},'W','S')).toBeNull();expect(bindingError({},'W','P')).toContain('Pause');
 expect(controlHint('W thrust · A/D turn · Shift fire · I cargo',p)).toBe('S thrust · A/D turn · Shift fire · I cargo');
});
it('loads only missing manifest quantities atomically and conserves local mass',()=>{
 const w=createWorld(), before=shipMass(w.ship);w.ship.freight.alloy=5;w.colony.products.alloy-=5;
 expect(manifestPlan(w,'expedition')).toMatchObject({mass:20,error:null});
 const stocks={...w.colony.products};loadManifest(w,'expedition');
 expect(w.ship.freight).toMatchObject(MANIFESTS.expedition.stock);expect(cargoMass(w.ship)).toBe(25);expect(shipMass(w.ship)-before).toBeCloseTo(25);
 expect(w.colony.products).toMatchObject({alloy:stocks.alloy-10,wire:stocks.wire-5,components:stocks.components-5});
 const aboard=structuredClone(w.ship.freight),local=structuredClone(w.colony.products);loadManifest(w,'expedition');expect(w.ship.freight).toEqual(aboard);expect(w.colony.products).toEqual(local);
});
it('blocks over-capacity, reserved, scarce, off-pad and foreign-world manifests without partial transfer',()=>{
 for(const configure of [(w:ReturnType<typeof createWorld>)=>w.ship.cargo.iron=110,(w:ReturnType<typeof createWorld>)=>w.colony.policy={energyReserve:0,deliveryReserve:0,alloyReserve:20,componentsReserve:0},(w:ReturnType<typeof createWorld>)=>w.colony.products.wire=0,(w:ReturnType<typeof createWorld>)=>w.ship.state='flying' as const]){
  const w=createWorld();configure(w);const stocks=structuredClone(w.colony.products);expect(manifestPlan(w,'expedition').error).toBeTruthy();loadManifest(w,'expedition');expect(cargoMass(w.ship)).toBe(w.ship.cargo.iron);expect(w.colony.products).toEqual(stocks);
 }
 const w=createWorld(),moon=colonyWorld(w,'moon');moon.colony.products.alloy=50;const before=structuredClone(w.outposts.moon);loadManifest(moon,'expedition');expect(w.outposts.moon).toEqual(before);expect(cargoMass(w.ship)).toBe(0);
});
it('routes native manifest actions through ordinary fixed simulation steps',()=>{
 const w=createWorld();stepWorld(w,{thrust:false,turn:0,colonyActions:[{type:'loadManifest',manifest:'expedition'}]},1/60);
 expect(cargoMass(w.ship)).toBe(25);expect(w.colony.products.alloy).toBe(13);expect(w.outposts.moon.colony.products.alloy).toBe(0);
 expect(decodeCheckpoint(encodeCheckpoint(w)).ship.freight).toEqual(w.ship.freight);
});
it('records real objective results, requires moon crew/extraction and preserves progression in current saves',()=>{
 const w=createWorld();observeObjectives(w);expect(w.objectives.completed).toEqual([]);
 w.unloaded=1;observeObjectives(w);expect(w.objectives.completed).toEqual(['delivery']);
 const moon=colonyWorld(w,'moon'),b=completedBuilding(1001,'miningRig',160/450,moon);moon.colony.buildings.push(b);moon.colony.nextId=1002;b.status='running';w.outposts.moon.surfaceDeposits[0].remaining-=1;
 observeObjectives(w);expect(w.objectives.completed).not.toContain('moonWork');
 w.playerMode='astronaut';w.astronaut.position=surfacePosition(planetAt('moon',w.system),0,2.5);observeObjectives(w);expect(w.objectives.completed).toContain('moonWork');expect(w.objectives.completed).not.toContain('return');
 w.playerMode='ship';observeObjectives(w);expect(w.objectives.completed).not.toContain('return');
 w.ship.state='flying';w.ship.position=surfacePosition(planetAt('moon',w.system),0,500);observeObjectives(w);expect(w.objectives.returnArmed).toBe(true);
 w.ship.state='crashed';observeObjectives(w);expect(w.objectives.returnArmed).toBe(false);
 w.ship.state='flying';observeObjectives(w);w.ship.state='landed';w.ship.position=surfacePosition(planetAt('home',w.system),0,7);w.ship.velocity={...planetAt('home',w.system).velocity};w.ship.ground='home';observeObjectives(w);expect(w.objectives.completed).toContain('return');
 const loaded=decodeCheckpoint(encodeCheckpoint(w));expect(loaded.objectives).toEqual(w.objectives);
 const bad=JSON.parse(encodeCheckpoint(w));bad.world.objectives.completed=['return'];expect(()=>decodeCheckpoint(JSON.stringify(bad))).toThrow();
 const original=structuredClone(w);observeObjectives(w);expect(w).toEqual(original);
});
it('culls only drawing and bounds rolling render measurements',()=>{
 expect(visible({centre:{x:0,y:0},radius:10},{x:12,y:0},2)).toBe(true);expect(visible({centre:{x:0,y:0},radius:10},{x:13,y:0},2)).toBe(false);
 const b=new RenderBudget();for(let i=0;i<200;i++)b.record('draw',2);expect(b.report('draw')).toEqual({mean:2,p95:2,samples:120});expect(b.report('hud')).toEqual({mean:0,p95:0,samples:0});
});

it('caps render-only fracture effects, freezes them on pause and removes them immediately for reduced motion',()=>{
 const w=createWorld(),effects=new VisualEffects(),view={centre:{x:0,y:0},radius:100000};effects.reset(w);w.asteroids=[];const before=structuredClone(w);
 effects.update(w,.01,false,12,view);expect(effects.count).toBe(12);expect(w).toEqual(before);
 effects.update(w,1,true,12,view);expect(effects.count).toBe(12);effects.update(w,0,true,0,view);expect(effects.count).toBe(0);
 effects.reset(createWorld());effects.update(w,.01,false,4,view);expect(effects.count).toBe(4);effects.update(w,1,false,4,view);expect(effects.count).toBe(0);
});
