import { FOCUS_Y } from '../src/render/camera';
import { expect,it } from 'vitest';
import { createWorld,stepWorld } from '../src/sim/world';
import { applyCrewOrder } from '../src/sim/crewOrders';
import { boardOrExit } from '../src/sim/surface';
import { applyCommandAction } from '../src/sim/command';
import { colonyWorld,localAngleAt } from '../src/sim/localWorld';
import { planetAt,surfacePosition,ORBIT_RATE } from '../src/sim/celestial';
import { encodeCheckpoint,decodeCheckpoint } from '../src/persistence/checkpoint';
import { screenToWorld } from '../src/render/pointer';
import { FixedClock } from '../src/sim/clock';
const setup=()=>{const w=createWorld();w.asteroids=[];w.exploration.sites=[];boardOrExit(w);return w;};
const tick=(w:ReturnType<typeof setup>,seconds:number)=>{for(let i=0;i<seconds*60;i++)stepWorld(w,{thrust:false,turn:0},1/60);};
it('walks a real crew member with acceleration, moving gravity frame and finite suit air',()=>{
 const w=setup(),initial={...w.astronaut.position};applyCrewOrder(w,{type:'crewOrder',operation:'walk',angle:120/1800});tick(w,1);
 expect(w.astronaut.position).not.toEqual(initial);expect(localAngleAt(w,w.astronaut.position)*1800).toBeLessThan(30);expect(w.astronaut.oxygen).toBeCloseTo(179);
 tick(w,15);expect(w.crewOrder).toBeNull();expect(localAngleAt(w,w.astronaut.position)*1800).toBeCloseTo(120,0);expect(w.astronaut.health).toBe(100);expect(w.colony.buildings).toHaveLength(0);
});
it('dispatches paid queued work without teleporting, free supplies or remote construction',()=>{
 const w=setup();applyCommandAction(w,{type:'queueBuild',kind:'solar',angle:300/1800});applyCrewOrder(w,{type:'crewOrder',operation:'build'});tick(w,1);expect(w.colony.buildings).toHaveLength(0);expect(w.colony.command.queue[0].progress).toBe(0);
 tick(w,40);expect(w.colony.buildings).toHaveLength(1);expect(w.colony.buildings[0].angle).toBe(300/1800);expect(w.crewOrder).toBeNull();expect(w.colony.products).toMatchObject({alloy:24,wire:12,components:7});expect(w.astronaut.oxygen).toBeLessThan(160);expect(w.moon.colony.buildings).toHaveLength(0);
});
it('manual movement, jumping, boarding and low air stop orders',()=>{
 for(const input of [{turn:-1},{turn:0,jump:true},{turn:0,board:true}]){const w=setup();applyCrewOrder(w,{type:'crewOrder',operation:'walk',angle:.5});stepWorld(w,{thrust:false,...input},1/60);expect(w.crewOrder).toBeNull();}
 const w=setup();w.astronaut.oxygen=29;const p={...w.astronaut.position};applyCrewOrder(w,{type:'crewOrder',operation:'walk',angle:.5});tick(w,.1);expect(w.crewOrder).toBeNull();expect(w.notice.message).toContain('LOW SUIT AIR');expect(Math.hypot(w.astronaut.position.x-p.x,w.astronaut.position.y-p.y)).toBeLessThan(1);expect(w.astronaut.oxygen).toBeLessThan(29);
});
it('rejects another world and ship-only dispatch, and stops unavailable queue work',()=>{
 const w=createWorld();applyCrewOrder(w,{type:'crewOrder',operation:'walk',angle:.2});expect(w.crewOrder).toBeNull();boardOrExit(w);applyCrewOrder(colonyWorld(w,'moon'),{type:'crewOrder',operation:'walk',angle:.2});expect(w.crewOrder).toBeNull();
 applyCommandAction(w,{type:'queueBuild',kind:'solar',angle:300/1800});applyCrewOrder(w,{type:'crewOrder',operation:'build'});w.colony.command.queue[0].paused=true;tick(w,1/60);expect(w.crewOrder).toBeNull();expect(w.colony.command.queue[0].progress).toBe(0);
});
it('follows the moon surface at quarter orbit and takes the short wrapped route',()=>{
 const w=setup();w.system.time=Math.PI/2/ORBIT_RATE;const p=planetAt('moon',w.system),moon=colonyWorld(w,'moon');w.astronaut.position=surfacePosition(p,3.1,2.5);w.astronaut.velocity={...p.velocity};applyCrewOrder(moon,{type:'crewOrder',operation:'walk',angle:-3.1});tick(w,10);
 expect(w.crewOrder).toBeNull();expect(localAngleAt(moon,w.astronaut.position)).toBeCloseTo(-3.1,2);expect(w.astronaut.grounded).toBe(true);expect(w.astronaut.health).toBe(100);
});
it('continues saved active orders and rejects malformed current-version orders',()=>{
 const w=setup();applyCrewOrder(w,{type:'crewOrder',operation:'walk',angle:.3});tick(w,1);const loaded=decodeCheckpoint(encodeCheckpoint(w));expect(loaded.crewOrder).toEqual(w.crewOrder);tick(w,5);tick(loaded,5);expect(loaded.astronaut.position).toEqual(w.astronaut.position);expect(loaded.astronaut.oxygen).toBe(w.astronaut.oxygen);
 for(const order of [{type:'fly',body:'home'},{type:'walk',body:'other',angle:0},{type:'walk',body:'home',angle:10}]){const save=JSON.parse(encodeCheckpoint(w));save.world.crewOrder=order;expect(()=>decodeCheckpoint(JSON.stringify(save))).toThrow();}
});
it('keeps dispatched construction equal at different renderer rates',()=>{
 const runs=[30,144].map(fps=>{const w=setup(),clock=new FixedClock();applyCommandAction(w,{type:'queueBuild',kind:'solar',angle:300/1800});applyCrewOrder(w,{type:'crewOrder',operation:'build'});for(let i=0;i<fps*40;i++)clock.advance(1/fps,dt=>stepWorld(w,{thrust:false,turn:0},dt));return w;});
 expect(runs[0].astronaut).toEqual(runs[1].astronaut);expect(runs[0].colony).toEqual(runs[1].colony);expect(runs[0].system).toEqual(runs[1].system);
});
it('inverts pointer coordinates at zoom and rotated local horizons',()=>{
 expect(screenToWorld({x:640,y:800*FOCUS_Y},{x:100,y:200,width:1280,height:800,zoom:2,angle:Math.PI/2})).toEqual({x:100,y:200});const p=screenToWorld({x:660,y:800*FOCUS_Y},{x:100,y:200,width:1280,height:800,zoom:2,angle:Math.PI/2});expect(p.x).toBeCloseTo(100);expect(p.y).toBeCloseTo(210);
});

it('an explicit stop pauses dispatched work without refunding or continuing another nearby order',()=>{
 const w=setup();applyCommandAction(w,{type:'queueBuild',kind:'solar',angle:120/1800});applyCommandAction(w,{type:'queueBuild',kind:'solar',angle:160/1800});applyCrewOrder(w,{type:'crewOrder',operation:'build'});tick(w,3);applyCrewOrder(w,{type:'crewOrder',operation:'stop'});const progress=w.colony.command.queue.map(o=>o.progress);tick(w,10);expect(w.crewOrder).toBeNull();expect(w.colony.command.queue.every(o=>o.paused)).toBe(true);expect(w.colony.command.queue.map(o=>o.progress)).toEqual(progress);expect(w.colony.products.alloy).toBe(20);expect(w.colony.buildings).toHaveLength(0);
});
