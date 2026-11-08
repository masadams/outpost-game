import type Phaser from 'phaser';
import { CELESTIAL, type BodyId } from '../sim/celestial';
/** Body-specific, cached geology, clipped within the exact circular collision surface. */
/** Ground colours (light, deep) for the worlds that are not grey rock. */
const PALETTE: Partial<Record<BodyId, [string, string]>> = { verdant: ['#5f8a5a', '#1f3d2c'], tide: ['#3f6f9a', '#122c48'], murk: ['#9a8253', '#3d3020'] };

export function createPlanet(scene: Phaser.Scene, body: BodyId = 'home'): Phaser.GameObjects.Image {
 const radius=CELESTIAL[body].radius,key=`surface-${body}`,size=body==='home'?2048:1024,extent=radius+2;
 if(!scene.textures.exists(key)){
  const texture=scene.textures.createCanvas(key,size,size)!,c=texture.context;
  c.translate(size/2,size/2);c.scale(size/(2*extent),size/(2*extent));
  c.save();c.beginPath();c.arc(0,0,radius,0,Math.PI*2);c.clip();
  const shade=c.createRadialGradient(-radius*.38,-radius*.7,0,0,0,radius*1.8);
  const pal=PALETTE[body];shade.addColorStop(0,pal?pal[0]:body==='home'?'#526b70':'#9b91a5');shade.addColorStop(.55,pal?pal[1]:body==='home'?'#213b47':'#494358');shade.addColorStop(1,'#091621');c.fillStyle=shade;c.fillRect(-radius,-radius,radius*2,radius*2);
  let seed=body==='home'?7249:1931;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<520;i++){
   const a=rand()*Math.PI*2,r=Math.sqrt(rand())*radius,x=Math.cos(a)*r,y=Math.sin(a)*r;
   const crater=radius*(.0015+rand()*.028);
   c.fillStyle=body==='home'?(i%5===0?'#75969622':'#091b252b'):(i%3===0?'#c8bfd327':'#18192b55');
   c.beginPath();c.ellipse(x,y,crater,crater*(.55+rand()*.45),a,0,Math.PI*2);c.fill();
   if(body==='moon'||i%6===0){c.strokeStyle=body==='moon'?'#b8a8bd55':'#b4ccbd28';c.lineWidth=radius*.001;c.beginPath();c.arc(x,y,crater,.85*Math.PI,1.8*Math.PI);c.stroke();}
  }
  // Surface shelves and narrow mineral seams stay inset: no decorative collision bumps.
  for(let band=0;band<3;band++){c.strokeStyle=body==='home'?['#a1b9b244','#62888955','#436b7755'][band]:['#e5cbbd44','#a9a4b355','#726d8944'][band];c.lineWidth=radius*.0015;c.beginPath();c.arc(0,0,radius-(4+band*12)*radius/1800,0,Math.PI*2);c.stroke();}
  c.restore();c.strokeStyle=body==='home'?'#a9d2c7':'#d0c4dd';c.lineWidth=1.2;c.beginPath();c.arc(0,0,radius,0,Math.PI*2);c.stroke();texture.refresh();
 }
 return scene.add.image(0,0,key).setDisplaySize(extent*2,extent*2);
}
