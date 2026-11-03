import type { Vec } from '../sim/math';
export interface PointerView { x:number;y:number;angle:number;zoom:number;width:number;height:number }
export function screenToWorld(point:Vec,view:PointerView):Vec {
 const x=(point.x-view.width/2)/view.zoom,y=(point.y-view.height*.53)/view.zoom,c=Math.cos(view.angle),s=Math.sin(view.angle);
 return {x:view.x+x*c-y*s,y:view.y+x*s+y*c};
}
