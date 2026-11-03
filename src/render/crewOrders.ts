import type Phaser from 'phaser';
import { colonyWorld,colonyPlanet,localAngleAt } from '../sim/localWorld';
import { heading,wrap } from '../sim/math';
import type { WorldState } from '../sim/world';
export function drawCrewOrder(g:Phaser.GameObjects.Graphics,w:WorldState,zoom:number):void{
 const order=w.crewOrder;if(!order)return;const site=colonyWorld(w,order.body),p=colonyPlanet(site),target=order.type==='walk'?order.angle:site.colony.command.queue.find(o=>!o.paused)?.angle;if(target===undefined)return;
 const start=localAngleAt(site,w.astronaut.position),delta=wrap(target-start);g.lineStyle(1/zoom,0xffc58c,.6);g.beginPath();
 for(let i=0;i<=24;i++){const n=heading(start+delta*i/24),x=p.position.x+n.x*(p.radius+3),y=p.position.y+n.y*(p.radius+3);if(i)g.lineTo(x,y);else g.moveTo(x,y);}g.strokePath();
 const n=heading(target);g.strokeCircle(p.position.x+n.x*(p.radius+3),p.position.y+n.y*(p.radius+3),6/zoom);
}
