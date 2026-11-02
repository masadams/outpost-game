import Phaser from 'phaser';
import type { Controls } from '../sim/physics';
export class Keyboard {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  constructor(scene: Phaser.Scene) {
    this.keys = scene.input.keyboard!.addKeys('W,A,D,UP,LEFT,RIGHT,R,P', true) as Record<string, Phaser.Input.Keyboard.Key>;
    window.addEventListener('blur', () => this.release());
  }
  release(): void { Object.values(this.keys).forEach(key => key.reset()); }
  read(): Controls {
    return { thrust: this.keys.W.isDown || this.keys.UP.isDown,
      turn: Number(this.keys.D.isDown || this.keys.RIGHT.isDown) - Number(this.keys.A.isDown || this.keys.LEFT.isDown) };
  }
  restart(): boolean { return Phaser.Input.Keyboard.JustDown(this.keys.R); }
  pause(): boolean { return Phaser.Input.Keyboard.JustDown(this.keys.P); }
}
