import { BINDING_LABELS, BINDING_SLOTS, bindingError, keyLabel, physicalKey, defaultPresentation, applyPresentation, type BindingSlot, type PresentationPreferences } from '../preferences/presentation';

export class Settings {
  readonly dialog = document.createElement('dialog');
  private capture: BindingSlot|null = null;
  constructor(readonly preferences: PresentationPreferences, private changed: () => void, private toggled: (open:boolean)=>void) {
    const d=this.dialog; d.id='settings'; d.setAttribute('aria-label','Settings and controls');
    d.innerHTML=`<div class="help-title"><h2>Flight deck settings</h2><button data-settings-close>Return to game</button></div><p>Paused while open. Preferences are separate from world checkpoints.</p>
      <div class="settings-grid"><div><label for="text-scale">Text size</label><select id="text-scale"><option value="1">Standard</option><option value="1.25">125%</option><option value="1.5">150%</option></select></div><div><label for="graphics-quality">Graphics quality</label><select id="graphics-quality"><option value="high">Detailed</option><option value="low">Reduced</option></select></div>
      <label><input type="checkbox" id="reduced-motion"> Reduced motion and flashes</label><label><input type="checkbox" id="building-labels-setting"> Building labels</label><label><input type="checkbox" id="camera-rotation"> Camera follows local horizon</label>
      <label>Effects volume<input aria-label="Effects volume" id="effects-volume" type="range" min="0" max="1" step="0.05"></label><label>Music volume<input aria-label="Music volume" id="music-volume" type="range" min="0" max="1" step="0.05"></label></div>
      <p>Reduced graphics limits decorative detail; physics, distant production and threats keep running. Reduced motion removes camera rotation, pulses and animated engine/suit accents.</p>
      <details><summary>Keyboard bindings · click a key to change it</summary><p>Choose an unused key. Duplicate bindings are rejected. Native controls keep Enter, Space and arrow navigation; typing in fields never flies the ship. This table lists the current controls; long-form guide examples use defaults.</p><div class="binding-grid">${BINDING_SLOTS.map(slot=>`<label>${BINDING_LABELS[slot]??(slot==='UP'?'Alternate thrust':slot==='LEFT'?'Alternate left':slot==='RIGHT'?'Alternate right':`Blueprint ${keyLabel(slot)}`)}<button type="button" data-bind="${slot}"></button></label>`).join('')}</div><button id="reset-bindings">Reset controls</button></details>
      <p id="binding-status" role="status" aria-live="polite"></p><button id="reset-presentation">Reset presentation preferences</button>`;
    document.body.append(d); this.sync();
    d.addEventListener('cancel', e=>{e.preventDefault();this.close();});
    d.querySelector('[data-settings-close]')!.addEventListener('click',()=>this.close());
    d.addEventListener('click',e=>{const slot=(e.target as HTMLElement).closest<HTMLElement>('[data-bind]')?.dataset.bind as BindingSlot|undefined;if(slot){this.capture=slot;this.message('Press a key for '+(BINDING_LABELS[slot]??slot)+'.');}});
    const edit = (id:string, fn:(el:HTMLInputElement)=>void) => d.querySelector('#'+id)!.addEventListener('input',e=>{fn(e.target as HTMLInputElement);this.save();});
    edit('text-scale',el=>preferences.textScale=Number(el.value)); edit('graphics-quality',el=>preferences.quality=el.value as 'high'|'low');
    edit('reduced-motion',el=>preferences.reducedMotion=el.checked);edit('building-labels-setting',el=>preferences.buildingLabels=el.checked);edit('camera-rotation',el=>preferences.cameraRotation=el.checked);
    edit('effects-volume',el=>preferences.effectsVolume=Number(el.value));edit('music-volume',el=>preferences.musicVolume=Number(el.value));
    d.querySelector('#reset-bindings')!.addEventListener('click',()=>{this.capture=null;preferences.bindings={};this.save();this.message('Default controls restored.');});
    d.querySelector('#reset-presentation')!.addEventListener('click',()=>{Object.assign(preferences,defaultPresentation(matchMedia('(prefers-reduced-motion: reduce)').matches));this.capture=null;this.save();});
    d.addEventListener('keydown',e=>{
      e.stopPropagation();
      if(this.capture){e.preventDefault();if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;const key=physicalKey(e.code);const error=bindingError(preferences.bindings,this.capture,key);if(error){this.message(error);return;}preferences.bindings[this.capture]=key;this.capture=null;this.save();this.message('Control updated.');}
    });
    d.addEventListener('keyup',e=>e.stopPropagation());
  }
  private message(text:string):void {this.dialog.querySelector('#binding-status')!.textContent=text;}
  private sync():void {
    const p=this.preferences;
    for(const [id,value] of [['text-scale',p.textScale],['graphics-quality',p.quality],['effects-volume',p.effectsVolume],['music-volume',p.musicVolume]]) (this.dialog.querySelector('#'+id) as HTMLInputElement).value=String(value);
    for(const [id,value] of [['reduced-motion',p.reducedMotion],['camera-rotation',p.cameraRotation],['building-labels-setting',p.buildingLabels]] as const) (this.dialog.querySelector('#'+id) as HTMLInputElement).checked=value;
    this.dialog.querySelectorAll<HTMLButtonElement>('[data-bind]').forEach(b=>{const slot=b.dataset.bind as BindingSlot;b.textContent=keyLabel(p.bindings[slot]??slot);b.setAttribute('aria-label',`Change ${BINDING_LABELS[slot]??slot} binding`);});
  }
  private save():void{applyPresentation(this.preferences);this.changed();this.sync();}
  get isOpen():boolean{return this.dialog.open;}
  toggle():void{if(this.isOpen)this.close();else{this.toggled(true);this.dialog.showModal();}}
  close():void{if(this.isOpen){this.capture=null;this.dialog.close();(document.activeElement as HTMLElement)?.blur();this.toggled(false);}}
  destroy():void{this.dialog.remove();}
}
