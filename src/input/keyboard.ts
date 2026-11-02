import Phaser from 'phaser';
import type { WorldControls } from '../sim/world';
import { BUILD_TYPES } from '../sim/colonyConfig';
import type { ColonyAction } from '../sim/colony';
export class Keyboard {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private pending = new Set<string>();
  constructor(scene: Phaser.Scene) {
    this.keys = scene.input.keyboard!.addKeys('W,A,D,UP,LEFT,RIGHT,R,P,SPACE,C,E,F,B,ONE,TWO,THREE,FOUR,FIVE,SIX,Q,T,ENTER,X,V,K,L', true) as Record<string, Phaser.Input.Keyboard.Key>;
    // Phaser clears JustDown on keyup; retain taps that begin/end between simulation steps.
    for (const name of ['F', 'E', 'SPACE', 'W', 'UP', 'R', 'P', 'B', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'Q', 'T', 'ENTER', 'X', 'V', 'K', 'L']) {
      this.keys[name].on('down', (_key: Phaser.Input.Keyboard.Key, event: KeyboardEvent) => {
        if (!event.repeat) this.pending.add(name);
      });
    }
    window.addEventListener('blur', () => this.release());
  }
  release(): void { Object.values(this.keys).forEach(key => key.reset()); this.pending.clear(); }
  private consume(name: string): boolean {
    const pressed = this.pending.delete(name);
    return this.keys[name].isDown || pressed;
  }
  read(): WorldControls {
    const board = this.consume('F'), interact = this.consume('E'), space = this.consume('SPACE');
    const w = this.consume('W'), up = this.consume('UP');
    const actions: ColonyAction[] = [];
    const commands: Array<[string, ColonyAction]> = [['B', { type: 'toggleBuild' }], ['Q', { type: 'shift', delta: -32 }], ['T', { type: 'shift', delta: 32 }],
      ['ENTER', { type: 'place' }], ['X', { type: 'demolish' }], ['V', { type: 'cycleRecipe' }]];
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'].forEach((key, i) => commands.push([key, { type: 'select', kind: BUILD_TYPES[i] }]));
    for (const [key, action] of commands) if (this.pending.delete(key)) actions.push(action);
    return { thrust: w || up,
      turn: Number(this.keys.D.isDown || this.keys.RIGHT.isDown) - Number(this.keys.A.isDown || this.keys.LEFT.isDown),
      mine: space, tractor: this.keys.C.isDown, unload: interact,
      board, jump: space || w || up, colonyActions: actions };
  }
  restart(): boolean { return this.pending.delete('R'); }
  pause(): boolean { return this.pending.delete('P'); }
  save(): boolean { return this.pending.delete('K'); }
  load(): boolean { return this.pending.delete('L'); }
}
