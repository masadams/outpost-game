export type MenuAction='new'|'continue'|'resume'|'save'|'title'|'settings'|'controls';
export interface MenuInfo { hasSave:boolean; saveStatus:string; hasRun:boolean }
/** Native modal entry/pause flow. The scene owns every world transition. */
export class GameMenu {
 private dialog=document.createElement('dialog');
 private mode:'title'|'pause'='title';
 private status='';
 constructor(private action:(action:MenuAction)=>void,private info:()=>MenuInfo,private resumeHint:()=>string){
  this.dialog.id='game-menu';this.dialog.setAttribute('aria-label','Outpost game menu');document.body.append(this.dialog);
  this.dialog.addEventListener('keydown',e=>e.stopPropagation());this.dialog.addEventListener('keyup',e=>e.stopPropagation());
  this.dialog.addEventListener('cancel',e=>{e.preventDefault();if(this.mode==='pause')this.action('resume');});
  this.dialog.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLButtonElement>('button[data-menu]');if(button&&!button.disabled)this.action(button.dataset.menu as MenuAction);});
 }
 get isOpen():boolean{return this.dialog.open;}
 open(mode:'title'|'pause'='pause'):void{this.mode=mode;this.status='';this.render();if(!this.dialog.open)this.dialog.showModal();this.dialog.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();}
 close():void{if(this.dialog.open)this.dialog.close();(document.activeElement as HTMLElement)?.blur();}
 message(text:string):void{this.status=text;this.render();}
 private render():void{
  const focused=this.dialog.contains(document.activeElement)?(document.activeElement as HTMLElement)?.dataset.menu:null;
  const info=this.info(),button=(action:MenuAction,label:string,disabled=false)=>`<button type="button" data-menu="${action}" ${disabled?'disabled':''}>${label}</button>`;
  this.dialog.innerHTML=`<div class="menu-brand"><span class="eyebrow">OUTPOST · ALPHA 0.21</span><h1>${this.mode==='title'?'OUTPOST':'Game paused'}</h1><p>Flight · mining · colony</p></div><nav aria-label="Game menu">${this.mode==='pause'?button('resume','Resume')+button('save','Save checkpoint')+button('continue','Load checkpoint',!info.hasSave):button('new','New Game')+button('continue','Continue',!info.hasSave)+(info.hasRun?button('resume','Resume current run'):'')}${button('settings','Settings')}${button('controls','Controls')}${this.mode==='pause'?button('title','Return to title'):''}</nav><p class="menu-status" role="status">${this.status||info.saveStatus}</p><small>Saved flights load paused; ${this.resumeHint()}. New Game starts a fresh runtime and keeps the old checkpoint until you save. Explicit saves retain one previous valid checkpoint. Menus freeze physics and silence gameplay audio.</small>`;
  if(focused)this.dialog.querySelector<HTMLButtonElement>(`button[data-menu="${focused}"]:not(:disabled)`)?.focus({preventScroll:true});
 }
 destroy():void{this.dialog.remove();}
}
