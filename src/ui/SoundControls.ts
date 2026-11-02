import { isolateControlKeys } from './controlKeys';
import type { GameAudio } from '../audio/GameAudio';
export class SoundControls {
  private root = document.createElement('div');
  private button: HTMLButtonElement;
  private enabling = false;
  constructor(private audio: GameAudio, onHelp: () => void) {
    this.root.id = 'sound-panel';
    this.root.innerHTML = '<button type="button" aria-label="Toggle sound mute" aria-pressed="false"></button><label>Vol <input aria-label="Sound volume" type="range" min="0" max="1" step="0.05"></label><button type="button" aria-label="Open quick-start guide">Help [H]</button>';
    document.body.append(this.root); this.button = this.root.querySelector('button')!;
    isolateControlKeys(this.root);
    const slider = this.root.querySelector('input')!; slider.value = String(audio.preferences.volume);
    slider.addEventListener('input', () => { audio.setVolume(Number(slider.value)); this.update(); });
    this.button.addEventListener('pointerdown', () => { this.enabling = audio.status === 'locked'; });
    this.button.addEventListener('click', () => { if (this.enabling || audio.status === 'locked') audio.enable(); else audio.toggleMute(); this.enabling = false; this.update(); });
    this.root.querySelectorAll('button')[1].addEventListener('click', onHelp); this.update();
  }
  update(): void {
    const status = this.audio.status;
    this.root.dataset.status = status; this.root.dataset.audible = String(this.audio.audible); this.root.dataset.loops = String(this.audio.loopCount);
    this.button.textContent = status === 'unavailable' ? 'No audio' : status === 'locked' ? 'Enable sound' : status === 'muted' ? 'Muted [M]' : 'Sound [M]';
    this.button.disabled = status === 'unavailable';
    this.button.setAttribute('aria-pressed', String(this.audio.preferences.muted));
    this.button.title = status === 'locked' ? 'Sound starts after a click or key press' : 'Toggle mute [M]';
  }
  destroy(): void { this.root.remove(); }
}
