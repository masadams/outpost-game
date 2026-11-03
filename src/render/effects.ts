import type Phaser from 'phaser';
import type { WorldState } from '../sim/world';
import type { Vec } from '../sim/math';
import { visible, type RenderView } from './budget';
interface Burst { position: Vec; life:number; color:number }
/** Render-only bounded bursts. Never saved, never collidable, never change simulation. */
export class VisualEffects {
 private previous=new Map<number,Vec>();
 private hull=100;
 private bursts:Burst[]=[];
 reset(w:WorldState):void{this.previous=new Map(w.asteroids.map(a=>[a.id,{...a.position}]));this.hull=w.ship.hull;this.bursts=[];}
 update(w:WorldState,dt:number,paused:boolean,limit:number,view:RenderView):void{
  this.bursts=limit===0?[]:this.bursts.slice(-limit);
  if(paused)return;
  this.bursts=this.bursts.map(b=>({...b,life:b.life-Math.max(0,dt)})).filter(b=>b.life>0).slice(-limit);
  if(limit===0)this.bursts=[];
  const ids=new Set(w.asteroids.map(a=>a.id));
  const add=(position:Vec,color:number)=>{if(limit>0&&visible(view,position,24)){this.bursts.push({position:{...position},life:.4,color});this.bursts=this.bursts.slice(-limit);}};
  for(const [id,p]of this.previous)if(!ids.has(id))add(p,0xffca8d);
  if(w.ship.hull<this.hull)add(w.ship.position,0xff987e);
  this.previous=new Map(w.asteroids.map(a=>[a.id,{...a.position}]));this.hull=w.ship.hull;
 }
 get count():number{return this.bursts.length;}
 draw(g:Phaser.GameObjects.Graphics,zoom:number):void{
  for(const b of this.bursts){const age=.4-b.life;g.lineStyle(1/zoom,b.color,b.life*2);g.strokeCircle(b.position.x,b.position.y,(2+age*20)/zoom);
   g.fillStyle(b.color,b.life*2);for(let i=0;i<6;i++){const a=i*Math.PI/3,r=age*35/zoom;g.fillCircle(b.position.x+Math.cos(a)*r,b.position.y+Math.sin(a)*r,.8/zoom);}
  }
 }
}
