import {groundVelocity,planetAt,nearestPlanet,relative,surfaceAngle,surfacePosition,type BodyId} from './celestial';
import {telemetry,type Controls} from './physics';
import {WORLD} from './config';
import {gravity} from './environment';
import {engineStats} from './shipStats';
import {shipMass} from './shipMass';
import {destination} from './exploration';
import {SITE_IDS,BELT_IDS,type Destination} from './explorationConfig';
import { wrap, type Vec } from './math';
import {flightComputer,type AutopilotAction,type AutopilotMode,type FlightProgram} from './autopilotConfig';
import {flightControl} from './flightController';
import {notify} from './messages';
import type {WorldState,WorldControls} from './world';
const routeHeight=(body:BodyId)=>body==='home'?3500:1000;
const bodyTarget=(target:Destination):target is BodyId=>target==='home'||target==='moon';
const advanceAngle=(from:number,to:number)=>wrap(from+Math.sign(wrap(to-from))*Math.min(Math.PI/4,Math.abs(wrap(to-from))));
export function autopilotError(w:WorldState,mode:AutopilotMode):string|null{
 const computer=flightComputer(w.ship),required=mode==='land'?1:mode==='home'?2:3;
 if(computer.tier<required)return `Fit ${required===1?'a landing':required===2?'a return':'a navigation'} computer at the home shipyard`;
 if(w.playerMode!=='ship'||w.ship.state==='crashed')return 'Board an intact ship';
 if(w.autopilot.program)return 'Disengage the active program first';
 if(w.towing.targetId!==null)return 'Release the tow cable before automatic flight';
 if(w.ship.fuel<=0)return 'No propellant available';
 if(w.ship.armament.energy<computer.power/60)return 'Flight computer needs ship cell power';
 const p=nearestPlanet(w.ship.position,w.system),t=telemetry(w.ship,WORLD.shipRadius,w.system);
 if(mode==='land'){
  if(w.ship.state!=='flying')return 'Already on the surface';
  const arc=Math.abs(wrap(surfaceAngle(p,w.ship.position)))*p.radius;
  if(t.altitude>500||arc>250||Math.abs(t.tangential)>10||-t.radial>15||t.tilt>Math.PI/3)return 'Prepare approach: within 500 m altitude / 250 m of pad; drift ≤10, descent ≤15 m/s, tilt ≤60°';
  if(t.altitude<30&&(t.tilt>.15||Math.abs(t.tangential)>2||arc>8))return 'Climb above 30 m or align over the pad before automatic landing';
  const g=gravity(w.ship.position,w.system),net=engineStats(w.ship).thrust/shipMass(w.ship)-Math.hypot(g.x,g.y),down=Math.max(0,-t.radial);
  if(net<=.1||down>2&&t.altitude<down*down/(2*net)+down*(t.tilt/1.7+.5)+10)return 'Insufficient stopping height / thrust for automatic landing';
 }
 const target=mode==='land'?p.id:mode==='home'?'home':w.exploration.selected;
 if(w.ship.state==='landed'&&bodyTarget(target)&&w.ship.ground===target)return 'Already landed at this destination';
 if((SITE_IDS as readonly string[]).includes(target)&&!w.exploration.sites.some(s=>s.key===target&&s.health>0))return 'Selected orbital site unavailable';
 if((BELT_IDS as readonly string[]).includes(target)&&![...w.asteroids,...w.pickups].some(b=>b.belt===target))return 'Selected belt has no tracked bodies';
 return null;
}
export function stopAutopilot(w:WorldState,reason:string):void{w.autopilot.program=null;w.autopilot.status=reason;notify(w,`AUTOPILOT OFF · ${reason}`);}
export function applyAutopilotAction(source:WorldState,a:AutopilotAction):void{
 const w=source.rootWorld??source;if(a.operation==='cancel'){if(w.autopilot.program)stopAutopilot(w,'Manual control');return;}
 if(!['land','home','navigate'].includes(a.operation))return;
 const error=autopilotError(w,a.operation);if(error){notify(w,error);return;}
 const origin=nearestPlanet(w.ship.position,w.system).id,target=a.operation==='land'?origin:a.operation==='home'?'home':w.exploration.selected,body=bodyTarget(target)?target:origin,t=telemetry(w.ship,WORLD.shipRadius,w.system);
 const phase=a.operation==='land'?(t.altitude<30&&t.speed<2&&t.tilt<.1?'landing':'approach'):'ascent';
 w.autopilot.program={mode:a.operation,target,body,origin,phase,angle:surfaceAngle(planetAt(origin,w.system),w.ship.position),duty:0,elapsed:0};w.autopilot.status='Engaged';notify(w,'AUTOPILOT ENGAGED · MANUAL FLIGHT OR TOOL INPUT DISENGAGES');
}
function hazard(w:WorldState):boolean{
 const s=w.ship;
 if(w.combat.enemies.some(e=>Math.hypot(e.position.x-s.position.x,e.position.y-s.position.y)<1500))return true;
 return [...w.asteroids,...w.exploration.sites,...w.defence.meteors].some(b=>{const dx=b.position.x-s.position.x,dy=b.position.y-s.position.y,vx=b.velocity.x-s.velocity.x,vy=b.velocity.y-s.velocity.y,time=Math.max(0,Math.min(3,-(dx*vx+dy*vy)/Math.max(.001,vx*vx+vy*vy)));return Math.hypot(dx+vx*time,dy+vy*time)<b.radius+WORLD.shipRadius+20;});
}
function goal(w:WorldState,p:FlightProgram):{position:Vec;velocity:Vec}{
 const body=planetAt(p.phase==='ascent'||p.phase==='depart'?p.origin:p.body,w.system);
 if(p.phase==='rendezvous'){
  const d=destination(w,p.target),near=nearestPlanet(d.position,w.system),r=relative(d.position,near),length=Math.max(1,Math.hypot(r.x,r.y)),offset=d.site?90:180;
  const vx=d.velocity.x-near.velocity.x,vy=d.velocity.y-near.velocity.y,radial=(vx*r.x+vy*r.y)/(length*length);
  return {position:{x:d.position.x+r.x/length*offset,y:d.position.y+r.y/length*offset},velocity:{x:d.velocity.x+(vx-r.x*radial)*offset/length,y:d.velocity.y+(vy-r.y*radial)*offset/length}};
 }
 const height=p.phase==='landing'?WORLD.shipRadius:p.phase==='approach'?150:routeHeight(body.id);
 const position=surfacePosition(body,p.phase==='landing'||p.phase==='approach'?0:p.angle,height);
 return {position,velocity:groundVelocity(body,position)};
}
function exitAngle(w:WorldState,p:FlightProgram):number{return bodyTarget(p.target)&&p.target===p.origin?0:surfaceAngle(planetAt(p.origin,w.system),destination(w,p.target).position);}
function advance(w:WorldState,p:FlightProgram):void{
 if(p.phase==='ascent'){p.phase='depart';p.angle=advanceAngle(p.angle,exitAngle(w,p));}
 else if(p.phase==='depart'){
  // A moving binary needs a departure corridor, not an exact bearing that keeps rotating.
  const exit=exitAngle(w,p);if(Math.abs(wrap(exit-p.angle))>(bodyTarget(p.target)?.2:.8))p.angle=advanceAngle(p.angle,exit);
  else if(!bodyTarget(p.target))p.phase='rendezvous';
  else if(p.body===p.origin)p.phase='approach';
  else{p.phase='transfer';p.angle=surfaceAngle(planetAt(p.body,w.system),w.ship.position);}
 }else if(p.phase==='transfer'){p.phase='arc';p.angle=advanceAngle(p.angle,0);}
 else if(p.phase==='arc'){if(Math.abs(p.angle)>.01)p.angle=advanceAngle(p.angle,0);else p.phase='approach';}
 else if(p.phase==='approach')p.phase='landing';
 else if(p.phase==='rendezvous'){w.autopilot.program=null;w.autopilot.status='Rendezvous complete · manual interaction';notify(w,'RENDEZVOUS COMPLETE · TOOLS / TRANSFERS REMAIN MANUAL');}
}
export function autopilotControls(w:WorldState,input:WorldControls,dt:number):Controls{
 const p=w.autopilot.program;if(!p)return input;
 if(input.thrust||input.turn!==0||input.mine||input.tractor||input.combatFire||input.board||input.unload){stopAutopilot(w,'Manual override');return input;}
 const computer=flightComputer(w.ship);
 if(w.playerMode!=='ship'||w.ship.state==='crashed'||computer.tier<(p.mode==='land'?1:p.mode==='home'?2:3)||w.towing.targetId!==null){stopAutopilot(w,'Control / equipment unavailable');return input;}
 if(p.phase==='landing'&&w.ship.state==='landed'&&w.ship.ground===p.body){w.autopilot.program=null;w.autopilot.status='Touchdown confirmed';notify(w,'AUTOPILOT · TOUCHDOWN CONFIRMED');return {thrust:false,turn:0};}
 if(w.ship.fuel<=0||w.ship.armament.energy+1e-9<computer.power*dt){stopAutopilot(w,w.ship.fuel<=0?'Propellant exhausted':'Ship cell power unavailable');return {thrust:false,turn:0};}
 if(p.elapsed>1200||hazard(w)){stopAutopilot(w,p.elapsed>1200?'Program time limit':'Nearby collision / combat hazard · take control');return {thrust:false,turn:0};}
 if((SITE_IDS as readonly string[]).includes(p.target)&&!w.exploration.sites.some(s=>s.key===p.target&&s.health>0)){stopAutopilot(w,'Destination unavailable');return {thrust:false,turn:0};}
 if((BELT_IDS as readonly string[]).includes(p.target)&&![...w.asteroids,...w.pickups].some(b=>b.belt===p.target)){stopAutopilot(w,'Destination depleted');return {thrust:false,turn:0};}
 const charge=computer.power*dt;w.ship.armament.energy=Math.max(0,w.ship.armament.energy-charge);w.autopilot.energyUsed+=charge;p.elapsed+=dt;
 const target=goal(w,p),range=Math.hypot(target.position.x-w.ship.position.x,target.position.y-w.ship.position.y),speed=Math.hypot(target.velocity.x-w.ship.velocity.x,target.velocity.y-w.ship.velocity.y);
 if(p.phase!=='landing'&&range<8&&speed<2){advance(w,p);if(!w.autopilot.program)return {thrust:false,turn:0};}
 w.autopilot.status=p.phase==='rendezvous'?'Orbital rendezvous':`${p.phase} · ${p.phase==='ascent'||p.phase==='depart'?p.origin:p.body}`;
 return flightControl(w.ship,goal(w,p),w.system,p,p.phase==='landing');
}
export function validAutopilot(w:WorldState):boolean{
 const a=w.autopilot;if(!a||typeof a!=='object'||typeof a.status!=='string'||a.status.length>160||!Number.isFinite(a.energyUsed)||a.energyUsed<0||a.energyUsed>1e9)return false;
 const p=a.program;if(p===null)return true;
 return !!p&&typeof p==='object'&&['land','home','navigate'].includes(p.mode)&&['home','moon',...SITE_IDS,...BELT_IDS].includes(p.target)&&['home','moon'].includes(p.origin)&&['home','moon'].includes(p.body)&&['ascent','depart','transfer','arc','approach','landing','rendezvous'].includes(p.phase)&&Number.isFinite(p.angle)&&Math.abs(p.angle)<=Math.PI&&Number.isFinite(p.duty)&&p.duty>=0&&p.duty<=2&&Number.isFinite(p.elapsed)&&p.elapsed>=0&&p.elapsed<=1201&&flightComputer(w.ship).tier>=(p.mode==='land'?1:p.mode==='home'?2:3)&&w.playerMode==='ship'&&w.ship.state!=='crashed'&&(!bodyTarget(p.target)?p.mode==='navigate'&&p.body===p.origin&&['ascent','depart','rendezvous'].includes(p.phase):p.body===p.target&&p.phase!=='rendezvous')&&(p.mode!=='home'||p.target==='home')&&(p.mode!=='land'||p.target===p.body&&p.origin===p.body&&['approach','landing'].includes(p.phase));
}
