import { groundVelocity, nearestPlanet, type BodyId } from './celestial';
import { colonyWorld, colonyPlanet, localAngleAt, upAngleAt } from './localWorld';
import { SUIT } from './astronaut';
import { habitatSource } from './habitats';
import { orderError } from './construction';
import { heading, wrap } from './math';
import { notify } from './messages';
import type { WorldState } from './world';
export type CrewOrder = { type:'walk'; body:BodyId; angle:number } | { type:'build'; body:BodyId };
export type CrewAction = { type:'crewOrder'; operation:'walk'|'build'|'stop'; angle?:number };
export function applyCrewOrder(w:WorldState,a:CrewAction):void {
 const root=w.rootWorld??w;
 if(a.operation==='stop'){const building=root.crewOrder?.type==='build';pauseCrewWork(root);root.crewOrder=null;notify(root,building?'CREW STOPPED · DISPATCHED BUILD QUEUE PAUSED':'CREW WALK STOPPED');return;}
 const body=colonyPlanet(w);
 if(w.playerMode!=='astronaut'||!w.astronaut.grounded||w.astronaut.health<=0||nearestPlanet(w.astronaut.position,w.system).id!==body.id){notify(root,'DEPLOY HEALTHY CREW ON THIS WORLD FIRST · F LEAVES THE SHIP');return;}
 if(a.operation==='walk'&&Number.isFinite(a.angle)&&Math.abs(a.angle!)<=Math.PI)root.crewOrder={type:'walk',body:body.id,angle:a.angle!};
 else if(a.operation==='build'&&w.colony.command.queue.some(o=>!o.paused))root.crewOrder={type:'build',body:body.id};
 else{notify(root,'NOTHING TO BUILD · PLACE A BUILDING FIRST');return;}
 root.defence.controlled=null;notify(root,a.operation==='walk'?'CREW WALK ORDER · MANUAL INPUT CANCELS':'CREW DISPATCHED · TRAVEL, AIR AND WORK STILL COUNT');
}
export function crewMove(w:WorldState,manual:boolean):number {
 const order=w.crewOrder;if(!order)return 0;
 if(manual){w.crewOrder=null;return 0;}
 const site=colonyWorld(w,order.body),s=w.astronaut,p=colonyPlanet(site);
 if(w.playerMode!=='astronaut'||!s.grounded||s.health<=0||w.defence.controlled!==null||nearestPlanet(s.position,w.system).id!==order.body){w.crewOrder=null;return 0;}
 if(s.oxygen<30&&!habitatSource(site)){pauseCrewWork(w);w.crewOrder=null;notify(w,'CREW ORDER STOPPED · LOW SUIT AIR · RETURN TO SERVICE');return 0;}
 const job=order.type==='build'?site.colony.command.queue.find(o=>!o.paused):null;
 if(order.type==='build'&&!job){w.crewOrder=null;notify(w,'CREW WORK COMPLETE · NO ACTIVE ORDERS');return 0;}
 if(job){const error=orderError(site,job.kind,job.angle,job.id);if(error){w.crewOrder=null;notify(w,`CREW ORDER BLOCKED · ${error}`);return 0;}}
 const target=order.type==='walk'?order.angle:job!.angle,distance=wrap(target-localAngleAt(site,s.position))*p.radius;
 const n=heading(upAngleAt(site,s.position)),ground=groundVelocity(p,s.position),speed=(s.velocity.x-ground.x)*-n.y+(s.velocity.y-ground.y)*n.x;
 const remaining=Math.max(0,Math.abs(distance)-(order.type==='build'?80:0));
 if(order.type==='walk'&&Math.abs(distance)<.5&&Math.abs(speed)<.5){w.crewOrder=null;notify(w,'CREW WAYPOINT REACHED');return 0;}
 return Math.sign(distance)*Math.min(1,remaining*2/SUIT.walkSpeed);
}
function pauseCrewWork(w:WorldState):void{if(w.crewOrder?.type==='build')for(const o of colonyWorld(w,w.crewOrder.body).colony.command.queue)o.paused=true;}
export function validCrewOrder(w:WorldState):boolean {
 const o=w.crewOrder;
 return o===null||!!o&&['walk','build'].includes(o.type)&&['home','moon'].includes(o.body)&&(o.type==='build'||Number.isFinite(o.angle)&&Math.abs(o.angle)<=Math.PI);
}
