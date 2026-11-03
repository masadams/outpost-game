import type { Vec } from '../sim/math';
export interface RenderView { centre: Vec; radius: number }
export const visible = (view: RenderView|undefined, position: Vec, radius=0): boolean => !view || Math.hypot(position.x-view.centre.x,position.y-view.centre.y)<=view.radius+radius;
/** Rolling CPU submission measurements, not GPU time or representative-hardware FPS. */
export class RenderBudget {
 private samples={draw:[] as number[],hud:[] as number[]};
 record(kind:'draw'|'hud',milliseconds:number):void{const list=this.samples[kind];list.push(milliseconds);if(list.length>120)list.shift();}
 report(kind:'draw'|'hud'):{mean:number;p95:number;samples:number}{const list=this.samples[kind],sorted=[...list].sort((a,b)=>a-b);return {mean:list.reduce((a,b)=>a+b,0)/(list.length||1),p95:sorted[Math.floor((sorted.length-1)*.95)]??0,samples:list.length};}
}
