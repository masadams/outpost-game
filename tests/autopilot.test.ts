import {expect,it} from 'vitest';
import {createWorld,stepWorld} from '../src/sim/world';
import {applyAutopilotAction} from '../src/sim/autopilot';
import {planetAt,surfacePosition,type BodyId} from '../src/sim/celestial';
import {TECH_IDS} from '../src/sim/progressionConfig';
import {WORLD,STEP} from '../src/sim/config';
const prepared=(body:BodyId='home',altitude=80)=>{const w=createWorld();w.asteroids=[];w.exploration.sites=[];w.colony.research.completed=[...TECH_IDS];w.ship.equipment=['navigationComputer'];const p=planetAt(body,w.system);w.ship.position=surfacePosition(p,0,WORLD.shipRadius+altitude);w.ship.velocity={...p.velocity};w.ship.state='flying';w.ship.ground=undefined;return w;};
function run(w:ReturnType<typeof prepared>,seconds=1100){for(let i=0;i<seconds/STEP&&w.autopilot.program;i++)stepWorld(w,{thrust:false,turn:0},STEP);return {status:w.autopilot.status,ship:w.ship.state,ground:w.ship.ground,fuel:w.ship.fuel,time:w.system.time,phase:w.autopilot.program?.phase};}
it.each(['home','moon'] as const)('lands through real thrust and unchanged touchdown classification on %s',body=>{const w=prepared(body);w.ship.equipment=['landingComputer'];applyAutopilotAction(w,{type:'autopilot',operation:'land'});expect(w.autopilot.program).not.toBeNull();const result=run(w);expect(result).toMatchObject({ship:'landed',ground:body,status:'Touchdown confirmed'});expect(w.ship.fuel).toBeLessThan(240);expect(w.ship.hull).toBe(100);expect(w.autopilot.energyUsed).toBeGreaterThan(0);},20000);
it('returns from another home longitude through a clear high arc and lands without teleporting',()=>{const w=prepared('home',1200),p=planetAt('home',w.system);w.ship.position=surfacePosition(p,.8,WORLD.shipRadius+1200);w.ship.angle=.8;w.ship.equipment=['returnComputer'];applyAutopilotAction(w,{type:'autopilot',operation:'home'});const result=run(w);expect(result).toMatchObject({ship:'landed',ground:'home',status:'Touchdown confirmed'});expect(w.ship.hull).toBe(100);expect(w.ship.fuel).toBeGreaterThan(0);},20000);
it('returns from the moving moon to home using finite ordinary propellant',()=>{const w=prepared('moon');w.ship.state='landed';w.ship.ground='moon';w.ship.position=surfacePosition(planetAt('moon',w.system),0,WORLD.shipRadius);w.ship.equipment=['returnComputer'];applyAutopilotAction(w,{type:'autopilot',operation:'home'});const result=run(w);expect(result).toMatchObject({ship:'landed',ground:'home',status:'Touchdown confirmed'});expect(w.ship.hull).toBe(100);expect(w.ship.fuel).toBeGreaterThan(0);},20000);
it('uses full navigation to fly from home to the moving moon and land',()=>{const w=prepared('home');w.ship.state='landed';w.ship.ground='home';w.ship.position=surfacePosition(planetAt('home',w.system),0,WORLD.shipRadius);w.exploration.selected='moon';applyAutopilotAction(w,{type:'autopilot',operation:'navigate'});const result=run(w);expect(result).toMatchObject({ship:'landed',ground:'moon',status:'Touchdown confirmed'});expect(w.ship.hull).toBe(100);},20000);

import {autopilotError,autopilotControls} from '../src/sim/autopilot';
import {flightComputer} from '../src/sim/autopilotConfig';
import {encodeCheckpoint,decodeCheckpoint} from '../src/persistence/checkpoint';
import {FixedClock} from '../src/sim/clock';
it('requires progressively researched paid hardware and a prepared landing approach',()=>{
 const w=prepared();w.ship.equipment=[];expect(autopilotError(w,'land')).toContain('landing computer');
 w.ship.equipment=['landingComputer'];expect(flightComputer(w.ship)).toMatchObject({tier:1,power:1});expect(autopilotError(w,'land')).toBeNull();expect(autopilotError(w,'home')).toContain('return');expect(autopilotError(w,'navigate')).toContain('navigation');
 w.ship.velocity.y=16;expect(autopilotError(w,'land')).toContain('Prepare approach');w.ship.velocity.y=0;w.ship.position.y-=600;expect(autopilotError(w,'land')).toContain('Prepare approach');
 w.ship.equipment=['returnComputer'];expect(autopilotError(w,'home')).toBeNull();expect(autopilotError(w,'navigate')).toContain('navigation');
});
it('charges actual cell energy per second without granting fuel, materials or impulses',()=>{
 const w=prepared();applyAutopilotAction(w,{type:'autopilot',operation:'land'});const before=structuredClone(w);autopilotControls(w,{thrust:false,turn:0},STEP);
 expect(w.autopilot.energyUsed).toBeCloseTo(3*STEP);expect(w.ship.armament.energy).toBeCloseTo(before.ship.armament.energy-3*STEP);expect(w.ship.fuel).toBe(before.ship.fuel);expect(w.ship.position).toEqual(before.ship.position);expect(w.ship.velocity).toEqual(before.ship.velocity);expect(w.colony).toEqual(before.colony);
});
it.each([{thrust:true,turn:0},{thrust:false,turn:1},{thrust:false,turn:0,mine:true},{thrust:false,turn:0,tractor:true},{thrust:false,turn:0,combatFire:true},{thrust:false,turn:0,board:true},{thrust:false,turn:0,unload:true}])('returns manual input unchanged and stops spending on override %j',input=>{
 const w=prepared();applyAutopilotAction(w,{type:'autopilot',operation:'land'});const energy=w.ship.armament.energy;expect(autopilotControls(w,input,STEP)).toBe(input);expect(w.autopilot.program).toBeNull();expect(w.autopilot.status).toBe('Manual override');expect(w.ship.armament.energy).toBe(energy);
});
it.each(['fuel','power','computer','tow','crash','hazard'] as const)('disengages on %s without extra thrust or computer spending',failure=>{
 const w=prepared();applyAutopilotAction(w,{type:'autopilot',operation:'land'});
 if(failure==='fuel')w.ship.fuel=0;if(failure==='power')w.ship.armament.energy=0;if(failure==='computer')w.ship.equipment=[];if(failure==='tow')w.towing.targetId=99;if(failure==='crash')w.ship.state='crashed';
 if(failure==='hazard'){const rock=createWorld().asteroids[0];w.asteroids=[{...rock,position:{...w.ship.position},velocity:{...w.ship.velocity}}];}
 const energy=w.ship.armament.energy;expect(autopilotControls(w,{thrust:false,turn:0},STEP)).toMatchObject({thrust:false,turn:0});expect(w.autopilot.program).toBeNull();expect(w.ship.armament.energy).toBe(energy);
});
it('saves active guidance but loads disarmed and rejects malformed or impossible programs',()=>{
 const w=prepared();applyAutopilotAction(w,{type:'autopilot',operation:'land'});autopilotControls(w,{thrust:false,turn:0},STEP);const loaded=decodeCheckpoint(encodeCheckpoint(w));expect(loaded.autopilot.program).toBeNull();expect(loaded.autopilot.status).toContain('disarmed');expect(loaded.ship).toEqual(w.ship);expect(loaded.autopilot.energyUsed).toBe(w.autopilot.energyUsed);
 for(const fields of [{mode:'cheat'},{target:'other'},{phase:'rendezvous'},{body:'moon'},{angle:4},{duty:-1},{elapsed:1202}]){const save=JSON.parse(encodeCheckpoint(w));Object.assign(save.world.autopilot.program,fields);expect(()=>decodeCheckpoint(JSON.stringify(save))).toThrow();}
 const save=JSON.parse(encodeCheckpoint(w));save.version=18;expect(()=>decodeCheckpoint(JSON.stringify(save))).toThrow();
});
it('keeps fixed-step automation, charge and touchdown equal at 30 and 144 renderer Hz',()=>{
 const runs=[30,144].map(fps=>{const w=prepared(),clock=new FixedClock();applyAutopilotAction(w,{type:'autopilot',operation:'land'});for(let i=0;i<fps*45;i++)clock.advance(1/fps,dt=>stepWorld(w,{thrust:false,turn:0},dt));return w;});expect(runs[0]).toEqual(runs[1]);expect(runs[0].ship.state).toBe('landed');
});
it('rendezvous with a moving orbital site without interacting or retargeting the program',()=>{
 const w=prepared('home',1200),site=createWorld().exploration.sites.find(s=>s.key==='survey')!;w.exploration.sites=[site];w.exploration.selected='survey';applyAutopilotAction(w,{type:'autopilot',operation:'navigate'});w.exploration.selected='moon';expect(w.autopilot.program?.target).toBe('survey');const initial=site.fuel,result=run(w);expect(result.status).toBe('Rendezvous complete · manual interaction');expect(w.ship.hull).toBe(100);expect(w.ship.state).toBe('flying');expect(w.exploration.salvaged).toBe(0);expect(w.exploration.surveyed).toEqual([]);expect(site.fuel).toBe(initial);
},20000);

it('rejects low misaligned or drifting approaches before they can spend computer power',()=>{
 for(const change of [(w:ReturnType<typeof prepared>)=>w.ship.angle=.5,(w:ReturnType<typeof prepared>)=>w.ship.velocity.x=3,(w:ReturnType<typeof prepared>)=>w.ship.position.x=15]){const w=prepared('home',5);change(w);expect(autopilotError(w,'land')).toContain('30 m');const before=structuredClone(w.ship);applyAutopilotAction(w,{type:'autopilot',operation:'land'});expect(w.autopilot.program).toBeNull();expect(w.ship).toEqual(before);}
});

it.each(['survey','frost'] as const)('disengages if the captured orbital destination %s becomes unavailable',target=>{
 const w=prepared(),original=createWorld();w.exploration.sites=original.exploration.sites;w.asteroids=original.asteroids.filter(b=>b.belt==='frost');w.exploration.selected=target;applyAutopilotAction(w,{type:'autopilot',operation:'navigate'});expect(w.autopilot.program?.target).toBe(target);w.exploration.sites=[];w.asteroids=[];const energy=w.ship.armament.energy;expect(autopilotControls(w,{thrust:false,turn:0},STEP)).toMatchObject({thrust:false,turn:0});expect(w.autopilot.program).toBeNull();expect(w.autopilot.status).toContain('Destination');expect(w.ship.armament.energy).toBe(energy);
});

it('disarms in the actual collision tick so a crash remains immediately saveable',()=>{
 const w=prepared();applyAutopilotAction(w,{type:'autopilot',operation:'land'});w.ship.velocity.y=300;for(let i=0;i<60&&w.ship.state!=='crashed';i++)stepWorld(w,{thrust:false,turn:0},STEP);expect(w.ship.state).toBe('crashed');expect(w.autopilot.program).toBeNull();expect(w.autopilot.status).toBe('Ship lost');expect(()=>encodeCheckpoint(w)).not.toThrow();
});
