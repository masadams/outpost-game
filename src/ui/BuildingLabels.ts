import {allColonies,colonyPlanet,sitePosition} from '../sim/localWorld';
import {BLUEPRINTS} from '../sim/colonyConfig';
import {facilityLevel} from '../sim/facilityStats';
import type {BodyId} from '../sim/celestial';
import type {WorldState} from '../sim/world';
import {worldToScreen,type PointerView} from '../render/pointer';
import {patchMarkup} from './dom';
import {isolateControlKeys} from './controlKeys';
/** Zoom at which labels are full size, the smallest they shrink to, and the zoom below which they hide. */
export const LABEL_FULL_ZOOM=0.7,LABEL_MIN_SCALE=0.6,LABEL_HIDE_ZOOM=0.2;
/** How big labels are at a zoom: 1 up close, shrinking to a minimum, and 0 (hidden) once buildings are only dots. */
export const labelScale=(zoom:number):number=>zoom<LABEL_HIDE_ZOOM?0:Math.max(LABEL_MIN_SCALE,Math.min(1,zoom/LABEL_FULL_ZOOM));
export class BuildingLabels {
 readonly root=document.createElement('div');
 constructor(select:(body:BodyId,id:number)=>void){
  this.root.id='building-labels';this.root.setAttribute('aria-label','Building labels');this.root.hidden=true;isolateControlKeys(this.root);
  this.root.addEventListener('click',event=>{const b=(event.target as HTMLElement).closest<HTMLButtonElement>('button[data-building-label]');if(b){select(b.dataset.body as BodyId,Number(b.dataset.buildingLabel));if(event.detail>0)b.blur();}});
 }
 update(w:WorldState,view:PointerView,enabled:boolean,selected:number|null,textScale=1):void{
  // Labels shrink as you zoom out and disappear when buildings are only dots, so they never crowd the view.
  const fit=labelScale(view.zoom),far=fit===0;this.root.hidden=!enabled||far;if(!enabled||far)return;
  this.root.style.setProperty('--label-scale',fit.toFixed(3));textScale*=fit;
  const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const occupied:Array<{x:number;y:number;width:number}>=[],labels:string[]=[];
  const entries=allColonies(w).flatMap(site=>site.colony.buildings.map(b=>({site,b}))).sort((a,b)=>Number(b.b.id===selected)-Number(a.b.id===selected)||a.b.id-b.b.id);
  for(const {site,b}of entries){
   const at=worldToScreen(sitePosition(site,b.angle,30),view);if(at.x<0||at.x>view.width||at.y<136||at.y>view.height-182)continue;
   const text=`#${b.id} ${BLUEPRINTS[b.kind].label}${facilityLevel(b)>1?` · T${facilityLevel(b)}`:''}`,width=Math.min(300,Math.max(100,text.length*6.5+16)*textScale),x=Math.max(4,Math.min(view.width-width-4,at.x-width/2));const height=24*textScale;let y=at.y-height;
   let clear=false;for(const offset of [0,height+4,(height+4)*2]){y=at.y-height-offset;if(y<130)continue;if(!occupied.some(o=>x<o.x+o.width+4&&x+width+4>o.x&&y<o.y+height+2&&y+height+2>o.y)){clear=true;break;}}
   if(!clear)continue;occupied.push({x,y,width});
   labels.push(`<button data-building-label="${b.id}" data-body="${site.siteBody??'home'}" aria-pressed="${b.id===selected}" aria-label="Inspect ${BLUEPRINTS[b.kind].label} ${b.id} on ${colonyPlanet(site).label}" title="${BLUEPRINTS[b.kind].label} · tier ${facilityLevel(b)} · ${escape(b.status)} · hull ${(b.health??100).toFixed(0)}%" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${width}px">${text}</button>`);
  }
  patchMarkup(this.root,labels.join(''));
 }
}
