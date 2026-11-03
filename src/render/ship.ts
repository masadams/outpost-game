import type Phaser from 'phaser';
import type { Ship } from '../sim/physics';
import { heading } from '../sim/math';
/** Close art is metres; only the explicit distant navigation glyph uses screen size. */
export function drawShip(g:Phaser.GameObjects.Graphics,s:Ship,zoom:number,time:number,paused:boolean,reduced:boolean):void{
 const n=heading(s.angle),right={x:-n.y,y:n.x};
 const p=(x:number,y:number)=>({x:s.position.x+right.x*x+n.x*y,y:s.position.y+right.y*x+n.y*y});
 const line=(x:number,y:number,a:number,b:number)=>{const u=p(x,y),v=p(a,b);g.lineBetween(u.x,u.y,v.x,v.y);};
 const danger=s.state==='crashed',color=danger?0xe69b88:0xabe7e5;
 if(zoom<.45){const a=8/zoom;g.lineStyle(1.3/zoom,color);g.strokePoints([p(0,a),p(a*.6,-a*.6),p(0,-a*.25),p(-a*.6,-a*.6)],true);return;}
 const hull=[p(0,6.8),p(2.4,3.4),p(5.5,-2.8),p(4.4,-4.8),p(-4.4,-4.8),p(-5.5,-2.8),p(-2.4,3.4)];
 g.lineStyle(.6,color);g.fillStyle(danger?0x4c3438:0x203c50);g.fillPoints(hull,true);g.strokePoints(hull,true);
 g.fillStyle(danger?0x644148:0x436276);g.fillPoints([p(0,5.8),p(0,-4.3),p(-3.8,-4.3),p(-3.8,-1)],true);
 g.fillStyle(0x0b1b28);g.fillPoints([p(0,3.8),p(1.6,1.5),p(1.2,-.1),p(-1.2,-.1),p(-1.6,1.5)],true);
 g.lineStyle(.45,0x92f4ed);line(-1.2,1,1.2,1);line(0,2.9,0,.2);
 g.lineStyle(.5,0x8ca7b9);for(const x of [-2.9,2.9]){line(x,-1,x,-3.5);line(x-.4,-2,x+.4,-2);}
 g.fillStyle(0x101f2a);g.fillPoints([p(-2.5,-4.2),p(2.5,-4.2),p(2,-5.2),p(-2,-5.2)],true);
 g.lineStyle(.65,danger?0x936a64:0xd0dfdf);for(const side of [-1,1]){line(side*3.5,-3.5,side*5,-7);line(side*4,-7,side*6,-7);}
 if(s.hull<75){g.lineStyle(.5,0xe39c78);line(1,0,3,-2);if(s.hull<40)line(-3,1,-1,-3);}
 if(s.thrusting&&!paused){const length=8+(reduced?0:Math.sin(time/65)*2);g.fillStyle(0xf3bd79,.75);g.fillPoints([p(-2,-5),p(2,-5),p(0,-5-length)],true);g.fillStyle(0xa3f8ff,.9);g.fillPoints([p(-1.2,-5),p(1.2,-5),p(0,-9)],true);}
 if(!reduced&&!paused&&Math.abs(s.angularVelocity)>.1){g.lineStyle(.6,0xa3f8ff,.6);const side=Math.sign(s.angularVelocity);line(side*4,0,side*7,0);}
}
