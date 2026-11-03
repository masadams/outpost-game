import { OBJECTIVES } from '../sim/objectives';
import type { WorldState } from '../sim/world';
import { setText, patchMarkup } from './dom';
import { controlHint, type PresentationPreferences } from '../preferences/presentation';
import { isolateControlKeys } from './controlKeys';
export class Objectives {
 readonly root=document.createElement('button');
 readonly content=document.createElement('section');
 constructor(open:()=>void){
  this.root.id='objectives';this.root.type='button';this.root.setAttribute('aria-label','Open expedition objectives');this.root.setAttribute('aria-controls','operations-dock');this.content.id='objective-panel';
  this.root.addEventListener('click',e=>{open();if(e.detail>0)this.root.blur();});isolateControlKeys(this.root);
 }
 update(w:WorldState,p:PresentationPreferences):void{
  const done=w.objectives.completed,next=OBJECTIVES.find(o=>!done.includes(o.id));
  const label=`Objectives ${done.length}/${OBJECTIVES.length} · ${next?.label??'Route complete'}`;
  setText(this.root,label);this.root.title=label;
  const hidden=!!this.content.closest('[hidden]');this.root.setAttribute('aria-expanded',String(!hidden));
  if(hidden)return;
  patchMarkup(this.content,OBJECTIVES.map(o=>`<article data-objective="${o.id}" data-complete="${done.includes(o.id)}"><b>${done.includes(o.id)?'✓':'○'} ${o.label}</b><p>${controlHint(o.hint,p)}</p></article>`).join('')+'<small>Progress records real play. No rewards, autopilot or free supplies. K saves progress with the world.</small>');
 }
}
