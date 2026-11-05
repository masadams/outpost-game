import type Phaser from 'phaser';
import type { BuildType } from '../sim/colonyConfig';
type Point = (x:number,y:number)=>{x:number;y:number};
/** Distinct machinery silhouettes; bounded detail per facility, no particle systems. */
export function facilityArt(g:Phaser.GameObjects.Graphics,kind:BuildType,p:Point,width:number,color:number,active:boolean):void{
 const line=(x:number,y:number,a:number,b:number)=>{const u=p(x,y),v=p(a,b);g.lineBetween(u.x,u.y,v.x,v.y);};
 const box=(x:number,y:number,w:number,h:number,fill:number)=>{const points=[p(x,y),p(x,y+h),p(x+w,y+h),p(x+w,y)];g.fillStyle(fill);g.fillPoints(points,true);g.strokePoints(points,true);};
 g.lineStyle(.7,color,active?.85:.35);
 if(kind==='solar'){
  const wing=[p(-width,5),p(-width+2,17),p(width,17),p(width-2,5)];g.fillStyle(0x174767);g.fillPoints(wing,true);g.strokePoints(wing,true);
  for(let i=1;i<6;i++)line(-width+2+((width*2-4)*i/6),6,-width+2+((width*2-4)*i/6),16);line(-width+1,11,width-1,11);line(0,0,0,5);
 }else if(kind==='storage'){for(const x of [-7,0,7]){box(x-2.5,1,5,13,0x3b4547);line(x-2.5,6,x+2.5,6);} }
 else if(kind==='battery'){for(const x of [-4,0,4]){box(x-1.4,2,2.8,10,0x193f47);line(x-1,10,x+1,10);} }
 else if(kind==='fuelProcessor'){for(const x of [-5,5]){const at=p(x,11);g.fillStyle(0x49445e);g.fillCircle(at.x,at.y,4.5);g.strokeCircle(at.x,at.y,4.5);line(x,1,x,6);}line(-5,4,5,4);}
 else if(kind==='service'){box(-width+1,1,width*2-2,10,0x284b58);line(-width,14,width,14);line(-width,1,-width,18);line(width,1,width,18);g.lineStyle(1.8,color);line(-2,6,2,6);line(0,4,0,8);}
 else if(kind==='researchLab'){box(-width+1,1,width*2-2,9,0x343a58);const at=p(3,14);g.strokeCircle(at.x,at.y,5);line(0,12,-5,24);line(-10,22,-1,26);g.lineStyle(.5,0xe0ecff,.8);line(-5,24,-3,27);}
 else if(kind==='observatory'){box(-width+2,1,width*2-4,8,0x2f4a63);const dome=p(0,9);g.fillStyle(0x3d5f80);g.fillCircle(dome.x,dome.y,7);g.strokeCircle(dome.x,dome.y,7);g.lineStyle(.9,0xdff3ff,.9);line(1,10,6,19);line(2.4,9,7.5,17.5);}
 else if(kind.startsWith('shield')){for(const y of [5,8,11,14,17])line(-5,y,5,y);line(0,1,0,22);const at=p(0,23);g.strokeCircle(at.x,at.y,3);}
 else if(kind==='refinery'){box(-5,1,10,10,0x4a453e);line(-width+3,13,-width+3,23);line(0,6,0,13);line(-4,8,4,8);}
 else if(kind==='laser'||kind==='flak'||kind==='missile'){box(-6,3,12,7,0x443e49);if(kind==='missile'){for(const x of [-4,0,4])box(x-1,10,2,8,0x73627d);}else{const at=p(0,11);g.fillStyle(0x5c5661);g.fillCircle(at.x,at.y,5);g.strokeCircle(at.x,at.y,5);}}
 // A lit port and foundation anchors communicate status without elaborate animation.
 for(const side of [-1,1]){box(side*(width-1)-1,0,2,2,0x8b9d9e);}
}
