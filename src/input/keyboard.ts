import { BINDING_SLOTS, type PresentationPreferences } from '../preferences/presentation';
import Phaser from 'phaser';
import type { WorldControls } from '../sim/world';
import { BUILD_TYPES } from '../sim/colonyConfig';
import type { ColonyAction } from '../sim/colony';
export class Keyboard {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private pending = new Set<string>();
  private onBlur = (): void => this.release();
  private onControlFocus = (event: FocusEvent): void => {
    if (event.target instanceof HTMLElement && event.target.closest('button, input, select, textarea, summary')) this.release();
  };
  private onCommandPointer = (event: Event): void => {
    if (event.target instanceof HTMLElement && event.target.closest('#command-console')) this.release();
  };
  constructor(private scene: Phaser.Scene, bindings: PresentationPreferences['bindings'] = {}) {
    this.keys = {}; this.setBindings(bindings);
    window.addEventListener('blur', this.onBlur); document.addEventListener('focusin', this.onControlFocus); document.addEventListener('pointerdown', this.onCommandPointer); document.addEventListener('dragstart', this.onCommandPointer);
  }
  setBindings(bindings: PresentationPreferences['bindings']): void {
    this.release(); this.scene.input.keyboard!.removeAllKeys(true);
    this.keys = Object.fromEntries(BINDING_SLOTS.map(slot => [slot, this.scene.input.keyboard!.addKey(bindings[slot] ?? slot, false)]));
    // Phaser clears JustDown on keyup; retain taps that begin/end between simulation steps.
    for (const name of ['F', 'E', 'SPACE', 'W', 'UP', 'P', 'B', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'G', 'U', 'Q', 'T', 'ENTER', 'V', 'K', 'M', 'H', 'J', 'MINUS', 'PLUS', 'ZERO', 'Z', 'SHIFT', 'BACKSPACE', 'I', 'ESC', 'Y']) {
      this.keys[name].on('down', (_key: Phaser.Input.Keyboard.Key, event: KeyboardEvent) => {
        if(name==='ESC'&&event.key==='Escape'&&event.target instanceof HTMLElement&&event.target.closest('dialog'))return;
        if (!(this.gameplayFocus() && ['W','UP','SPACE','SHIFT','C'].includes(name)) && !this.typing() && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) this.pending.add(name);
      });
    }
  }
  private gameplayFocus(): boolean { return document.activeElement instanceof HTMLElement && !!document.activeElement.closest('button,input,select,textarea,summary,[contenteditable=true]'); }
  private typing(): boolean { return document.activeElement instanceof HTMLElement && document.activeElement.matches('input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=button]), select, textarea, [contenteditable=true]'); }
  release(): void { Object.values(this.keys).forEach(key => key.reset()); this.pending.clear(); }
  private consume(name: string): boolean {
    const pressed = this.pending.delete(name);
    return this.held(name) || pressed;
  }
  private held(name: string): boolean { const key = this.keys[name]; return !this.gameplayFocus() && key.isDown && !key.ctrlKey && !key.metaKey && !key.altKey; }
  read(): WorldControls {
    const board = this.consume('F'), interact = this.consume('E'), space = this.consume('SPACE');
    const w = this.consume('W'), up = this.consume('UP');
    const actions: ColonyAction[] = [];
    const commands: Array<[string, ColonyAction]> = [['B', { type: 'toggleBuild' }], ['Q', { type: 'shift', delta: -32 }], ['T', { type: 'shift', delta: 32 }],
      ['Y', { type: 'toggleTow' }], ['Z', { type: 'cycleWeapon' }], ['BACKSPACE', { type: 'recoverShip' }], ['G', { type: 'toggleAuto' }], ['U', { type: 'repairBuilding' }], ['ENTER', { type: 'place' }], ['V', { type: 'cycleRecipe' }]];
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'].forEach((key, i) => commands.push([key, { type: 'select', kind: BUILD_TYPES[i] }]));
    for (const [key, action] of commands) if (this.pending.delete(key)) actions.push(action);
    return { thrust: w || up, combatFire: this.consume('SHIFT'),
      turn: Number(this.held('D') || this.held('RIGHT')) - Number(this.held('A') || this.held('LEFT')),
      mine: space, tractor: this.held('C'), unload: interact,
      board, jump: space || w || up, colonyActions: actions };
  }
  planningActions():ColonyAction[]{const actions:ColonyAction[]=[];if(this.pending.delete('B'))actions.push({type:'toggleBuild'});if(this.pending.delete('Q'))actions.push({type:'shift',delta:-32});if(this.pending.delete('T'))actions.push({type:'shift',delta:32});['ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE'].forEach((key,i)=>{if(this.pending.delete(key))actions.push({type:'select',kind:BUILD_TYPES[i]});});return actions;}
  inventory(): boolean { return this.pending.delete('I'); }
  closePanel(): boolean { return this.pending.delete('ESC'); }
  pause(): boolean { return this.pending.delete('P'); }
  save(): boolean { return this.pending.delete('K'); }
  mute(): boolean { return this.pending.delete('M'); }
  help(): boolean { return this.pending.delete('H'); }
  trajectory(): boolean { return this.pending.delete('J'); }
  zoomIn(): boolean { return this.pending.delete('PLUS'); }
  zoomOut(): boolean { return this.pending.delete('MINUS'); }
  autoZoom(): boolean { return this.pending.delete('ZERO'); }
  destroy(): void { window.removeEventListener('blur', this.onBlur); document.removeEventListener('focusin', this.onControlFocus); document.removeEventListener('pointerdown', this.onCommandPointer); document.removeEventListener('dragstart', this.onCommandPointer); this.release(); }
}
