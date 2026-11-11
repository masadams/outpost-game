import type { SaveSlot, SlotRow } from '../persistence/slots';

export type MenuAction = 'new' | 'continue' | 'resume' | 'save' | 'title' | 'settings' | 'controls' | 'saves' | 'back';
export type SlotOp = 'save' | 'load' | 'delete';
export interface MenuInfo { hasSave: boolean; saveStatus: string; hasRun: boolean; seed?: number }

interface MenuItem { action: MenuAction; label: string; disabled?: boolean; primary?: boolean }

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Native modal for the title screen and the pause menu. The scene owns every world transition. */
export class GameMenu {
  private dialog = document.createElement('dialog');
  private mode: 'title' | 'pause' = 'title';
  /** The Saves screen is open over the title or pause menu. */
  private savesOpen = false;
  private status = '';
  /** A slot action waiting for a second press, e.g. "load:2". */
  private confirmSlot: string | null = null;

  constructor(
    private action: (action: MenuAction) => void,
    private info: () => MenuInfo,
    private resumeHint: () => string,
    private slots: { rows: () => SlotRow[]; act: (op: SlotOp, slot: SaveSlot) => void },
  ) {
    this.dialog.id = 'game-menu';
    this.dialog.setAttribute('aria-label', 'Outpost game menu');
    document.body.append(this.dialog);
    this.dialog.addEventListener('keydown', e => e.stopPropagation());
    this.dialog.addEventListener('keyup', e => e.stopPropagation());
    this.dialog.addEventListener('cancel', e => {
      e.preventDefault();
      if (this.savesOpen) this.showSaves(false);
      else if (this.mode === 'pause') this.action('resume');
    });
    this.dialog.addEventListener('click', e => {
      const slotButton = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-slot-op]');
      if (slotButton && !slotButton.disabled) {
        this.slotPress(slotButton.dataset.slotOp as SlotOp, slotButton.dataset.slot as string);
        return;
      }
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-menu]');
      if (!button || button.disabled) return;
      const action = button.dataset.menu as MenuAction;
      // Loading mid-game throws away what has happened since the last save: ask first.
      if (action === 'continue' && this.mode === 'pause' && !this.confirmLoad) {
        this.confirmLoad = true;
        this.message('Load the last save? Anything since then will be lost.');
        return;
      }
      this.confirmLoad = false;
      if (action === 'saves' || action === 'back') {
        this.showSaves(action === 'saves');
        return;
      }
      this.action(action);
    });
  }

  private showSaves(open: boolean): void {
    this.savesOpen = open;
    this.confirmSlot = null;
    this.status = '';
    this.render();
    this.dialog.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }

  /** Loading over a running game, saving over a save and deleting each ask for a second press. */
  private slotPress(op: SlotOp, raw: string): void {
    const slot: SaveSlot = raw === 'auto' ? 'auto' : (Number(raw) as SaveSlot);
    const row = this.slots.rows().find(r => r.slot === slot);
    const risky = op === 'delete' || (op === 'load' && this.info().hasRun) || (op === 'save' && !!row && !row.empty);
    const key = `${op}:${raw}`;
    if (risky && this.confirmSlot !== key) {
      this.confirmSlot = key;
      this.message(
        op === 'delete' ? 'Delete this save? Press Delete again.'
          : op === 'save' ? 'Save over this one? Press Save again.'
            : 'Load this save? Anything since your last save will be lost. Press Load again.',
      );
      return;
    }
    this.confirmSlot = null;
    this.slots.act(op, slot);
  }

  /** True after one press of Load in the pause menu: the next press loads. */
  private confirmLoad = false;

  get isOpen(): boolean { return this.dialog.open; }

  open(mode: 'title' | 'pause' = 'pause'): void {
    this.mode = mode;
    this.savesOpen = false;
    this.confirmSlot = null;
    this.status = '';
    this.confirmLoad = false;
    this.render();
    if (!this.dialog.open) this.dialog.showModal();
    this.dialog.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }

  close(): void {
    if (this.dialog.open) this.dialog.close();
    (document.activeElement as HTMLElement)?.blur();
  }

  message(text: string): void {
    this.status = text;
    this.render();
  }

  private items(info: MenuInfo): MenuItem[] {
    const common: MenuItem[] = [
      { action: 'settings', label: 'Settings' },
      { action: 'controls', label: 'Controls' },
    ];
    if (this.mode === 'pause') {
      return [
        { action: 'resume', label: 'Resume', primary: true },
        { action: 'save', label: 'Save game' },
        { action: 'saves', label: 'Saves' },
        { action: 'continue', label: this.confirmLoad ? 'Yes, load last save' : 'Load last save', disabled: !info.hasSave },
        ...common,
        { action: 'title', label: 'Return to title' },
      ];
    }
    return [
      { action: 'new', label: 'New Game', primary: true },
      { action: 'continue', label: 'Continue', disabled: !info.hasSave },
      { action: 'saves', label: 'Load a save' },
      ...(info.hasRun ? [{ action: 'resume', label: 'Resume current run' } as MenuItem] : []),
      ...common,
    ];
  }

  private savesHtml(hasRun: boolean): string {
    const when = (at: number) => {
      const d = new Date(at);
      return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
    };
    const pressed = (op: SlotOp, slot: SaveSlot, label: string) =>
      this.confirmSlot === `${op}:${slot}` ? `Yes, ${label.toLowerCase()}` : label;
    const rows = this.slots.rows().map(r => {
      const name = r.slot === 'auto' ? 'Autosave' : `Save ${r.slot}`;
      const line = r.broken ? 'Cannot be opened by this version.'
        : r.empty ? 'Empty'
          : r.meta ? `${escapeHtml(r.meta.label)} · ${when(r.meta.savedAt)}` : 'Saved game';
      const buttons: string[] = [];
      const button = (op: SlotOp, label: string, disabled = false, title = '') =>
        `<button type="button" data-slot-op="${op}" data-slot="${r.slot}" ${disabled ? 'disabled' : ''} ${title ? `title="${title}"` : ''}>${pressed(op, r.slot, label)}</button>`;
      buttons.push(button('load', 'Load', r.empty || r.broken, r.empty ? 'Nothing saved here yet' : r.broken ? 'This save cannot be opened' : ''));
      if (r.slot !== 'auto') {
        buttons.push(button('save', 'Save', !hasRun, hasRun ? '' : 'Start or load a game first'));
        buttons.push(button('delete', 'Delete', r.empty));
      }
      return `<li class="menu-slot" data-slot-row="${r.slot}" data-empty="${r.empty}"><div><strong>${name}</strong><span>${line}</span></div><div class="menu-slot-actions">${buttons.join('')}</div></li>`;
    });
    return `<ul class="menu-slots" aria-label="Saves">${rows.join('')}</ul>`;
  }

  private render(): void {
    const active = this.dialog.contains(document.activeElement) ? (document.activeElement as HTMLElement) : null;
    const focused = active?.dataset.menu ?? null;
    const info = this.info();
    if (active?.dataset.slotOp) {
      const selector = `button[data-slot-op="${active.dataset.slotOp}"][data-slot="${active.dataset.slot}"]`;
      queueMicrotask(() => this.dialog.querySelector<HTMLButtonElement>(`${selector}:not(:disabled)`)?.focus({ preventScroll: true }));
    }
    if (this.savesOpen) {
      this.dialog.innerHTML = `<div class="menu-brand"><span class="menu-eyebrow">Saves</span><h1>Saves</h1><p>Three saves of your own, and the autosave.</p></div>
      ${this.savesHtml(info.hasRun)}
      <nav aria-label="Game menu"><button type="button" data-menu="back">Back</button></nav>
      <p class="menu-status" role="status">${escapeHtml(this.status)}</p>
      <small>The autosave runs every two minutes of play. Quick save (K) writes it too.</small>`;
      return;
    }
    const buttons = this.items(info)
      .map(i => `<button type="button" data-menu="${i.action}" ${i.primary ? 'data-primary="true"' : ''} ${i.disabled ? 'disabled' : ''}>${i.label}</button>`)
      .join('');
    const title = this.mode === 'title' ? 'Outpost' : 'Paused';
    const tagline = this.mode === 'title' ? 'Fly. Mine. Build.' : 'The game is stopped while this is open.';
    const note =
      this.mode === 'title'
        ? `Saved games open paused. ${this.resumeHint()}. New Game keeps your old save until you save again.`
        : 'Saving keeps your previous save as a backup.';
    this.dialog.innerHTML = `<div class="menu-brand"><span class="menu-eyebrow">Alpha 0.21</span><h1>${title}</h1><p>${tagline}</p></div>
      <nav aria-label="Game menu">${buttons}</nav>
      <p class="menu-status" role="status">${escapeHtml(this.status || info.saveStatus)}</p>
      <small>${escapeHtml(note)}</small>
      ${this.mode === 'pause' && info.seed ? `<small class="menu-seed">World seed ${info.seed}</small>` : ''}`;
    if (focused) this.dialog.querySelector<HTMLButtonElement>(`button[data-menu="${focused}"]:not(:disabled)`)?.focus({ preventScroll: true });
  }

  destroy(): void { this.dialog.remove(); }
}
