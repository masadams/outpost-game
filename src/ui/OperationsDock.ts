import { isolateControlKeys } from './controlKeys';
import type { DockView, HudContext } from './context';

const labels: Record<DockView, string> = { cargo: 'Cargo', colony: 'Colony', combat: 'Combat', defence: 'Defence', command: 'Command' };
export class OperationsDock {
  readonly nav = document.createElement('nav');
  readonly root = document.createElement('aside');
  readonly cargo = document.createElement('section');
  readonly colony = document.createElement('section');
  readonly combat = document.createElement('section');
  readonly command = document.createElement('section');
  readonly defence = document.createElement('section');
  private heading = document.createElement('span');
  private contextKey = '';
  private view: DockView | null = null;
  constructor() {
    this.nav.className = 'dock-nav'; this.nav.setAttribute('aria-label', 'Operations panels');
    this.nav.innerHTML = Object.entries(labels).map(([view, label]) => `<button type="button" data-panel="${view}" aria-controls="operations-dock" aria-expanded="false">${label}${view === 'cargo' ? ' [I]' : ''}</button>`).join('');
    this.root.id = 'operations-dock'; this.root.setAttribute('aria-label', 'Operations'); this.root.hidden = true;
    const header = document.createElement('div'); header.className = 'dock-heading';
    const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Close [Esc]'; close.setAttribute('aria-label', 'Close operations panel'); close.onclick = () => this.close();
    header.append(this.heading, close); this.root.append(header);
    this.cargo.className = 'mining'; this.cargo.setAttribute('aria-label', 'Cargo and mining telemetry');
    this.colony.className = 'colony-panel'; this.colony.setAttribute('aria-label', 'Colony construction and production');
    this.combat.id = 'combat-content'; this.defence.id = 'defence-content';
    this.root.append(this.cargo, this.colony, this.combat, this.defence, this.command);
    this.nav.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (button?.dataset.panel) { this.toggle(button.dataset.panel as DockView); if (event.detail > 0) button.blur(); }
    });
    isolateControlKeys(this.nav); isolateControlKeys(this.root);
  }
  update(context: HudContext): void {
    if (context.key !== this.contextKey) { this.contextKey = context.key; this.view = context.view; this.render(); }
  }
  toggle(view: DockView): void { this.view = this.view === view ? null : view; this.render(); }
  close(): void {
    this.view = null;
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && (this.root.contains(focused) || this.nav.contains(focused))) focused.blur();
    this.render();
  }
  private render(): void {
    this.root.hidden = this.view === null; this.root.dataset.panel = this.view ?? 'closed';
    this.heading.textContent = this.view ? labels[this.view].toUpperCase() : '';
    const sections = { cargo: this.cargo, colony: this.colony, combat: this.combat, defence: this.defence, command: this.command };
    for (const [view, section] of Object.entries(sections)) section.hidden = view !== this.view;
    for (const button of Array.from(this.nav.querySelectorAll('button'))) {
      const selected = button.dataset.panel === this.view;
      button.setAttribute('aria-expanded', String(selected)); button.classList.toggle('selected', selected);
    }
  }
}
