import {nearestPlanet,relative,relativeVelocity,type SystemFrame} from './celestial';
import {gravity} from './environment';
import {WORLD} from './config';
import {wrap,clamp,type Vec} from './math';
import {engineStats} from './shipStats';
import {shipMass} from './shipMass';
import type {Ship,Controls} from './physics';
import type {FlightProgram} from './autopilotConfig';
/** Guidance produces ordinary bounded controls. The ship integrator owns every impulse and contact. */
export function flightControl(s:Ship,target:{position:Vec;velocity:Vec},system:SystemFrame,program:FlightProgram,landing:boolean):Controls{
 const dx=target.position.x-s.position.x,dy=target.position.y-s.position.y,distance=Math.hypot(dx,dy),speed=Math.min(180,Math.sqrt(4*distance));
 const g=gravity(s.position,system),authority=engineStats(s).thrust/shipMass(s);
 let ax=(target.velocity.x+dx/Math.max(1,distance)*speed-s.velocity.x)/2-g.x;
 let ay=(target.velocity.y+dy/Math.max(1,distance)*speed-s.velocity.y)/2-g.y;
 if(landing){ax=(target.velocity.x+clamp(dx*.3,-2,2)-s.velocity.x)*.5-g.x;ay=target.velocity.y+(dy>0?Math.min(20,Math.sqrt(dy*1.5)):Math.max(-3,dy*.25))-s.velocity.y-g.y;}
 const desired=landing?(ay>=0?0:clamp(Math.atan2(ax,-ay),-.15,.15)):Math.atan2(ax,-ay),error=wrap(desired-s.angle),drive=error*3-s.angularVelocity*1.5;
 const turn=Math.abs(drive)>.025?Math.sign(drive):0;
 program.duty=Math.min(1.99,program.duty+Math.min(1,(landing?Math.max(0,-ay)/Math.cos(desired):Math.hypot(ax,ay))/authority));
 let thrust=Math.abs(error)<.15&&program.duty>=1;if(thrust)program.duty-=1;
 if(landing){const p=nearestPlanet(target.position,system),r=relative(s.position,p),v=relativeVelocity(s.velocity,p,s.position);if(Math.hypot(r.x,r.y)-p.radius-WORLD.shipRadius<1.5&&Math.hypot(v.x,v.y)<4)thrust=false;}
 return {thrust,turn};
}
