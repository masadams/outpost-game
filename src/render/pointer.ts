import type { Vec } from '../sim/math';
import { FOCUS_Y } from './camera';
export interface PointerView { x:number;y:number;angle:number;zoom:number;width:number;height:number }
export function screenToWorld(point:Vec,view:PointerView):Vec {
 const x=(point.x-view.width/2)/view.zoom,y=(point.y-view.height*FOCUS_Y)/view.zoom,c=Math.cos(view.angle),s=Math.sin(view.angle);
 return {x:view.x+x*c-y*s,y:view.y+x*s+y*c};
}
export function worldToScreen(point:Vec,view:PointerView):Vec {
 const x=point.x-view.x,y=point.y-view.y,c=Math.cos(view.angle),s=Math.sin(view.angle);
 return {x:view.width/2+(x*c+y*s)*view.zoom,y:view.height*FOCUS_Y+(-x*s+y*c)*view.zoom};
}
