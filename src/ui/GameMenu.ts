export type MenuAction = 'new' | 'continue' | 'resume' | 'save' | 'title' | 'settings' | 'controls';
export interface MenuInfo { hasSave: boolean; saveStatus: string; hasRun: boolean; seed?: number }

interface MenuItem { action: MenuAction; label: string; disabled?: boolean; primary?: boolean }

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Native modal for the title screen and the pause menu. The scene owns every world transition. */
export class GameMenu {
  private dialog = document.createElement('dialog');
  private mode: 'title' | 'pause' = 'title';
  private status = '';

  constructor(private action: (action: MenuAction) => void, private info: () => MenuInfo, private resumeHint: () => string) {
    this.dialog.id = 'game-menu';
    this.dialog.setAttribute('aria-label', 'Outpost game menu');
    document.body.append(this.dialog);
    this.dialog.addEventListener('keydown', e => e.stopPropagation());
    this.dialog.addEventListener('keyup', e => e.stopPropagation());
    this.dialog.addEventListener('cancel', e => {
      e.preventDefault();
      if (this.mode === 'pause') this.action('resume');
    });
    this.dialog.addEventListener('click', e => {
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
      this.action(action);
    });
  }

  /** True after one press of Load in the pause menu: the next press loads. */
  private confirmLoad = false;

  get isOpen(): boolean { return this.dialog.open; }

  open(mode: 'title' | 'pause' = 'pause'): void {
    this.mode = mode;
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
        { action: 'continue', label: this.confirmLoad ? 'Yes, load last save' : 'Load last save', disabled: !info.hasSave },
        ...common,
        { action: 'title', label: 'Return to title' },
      ];
    }
    return [
      { action: 'new', label: 'New Game', primary: true },
      { action: 'continue', label: 'Continue', disabled: !info.hasSave },
      ...(info.hasRun ? [{ action: 'resume', label: 'Resume current run' } as MenuItem] : []),
      ...common,
    ];
  }

  private render(): void {
    const focused = this.dialog.contains(document.activeElement) ? (document.activeElement as HTMLElement)?.dataset.menu : null;
    const info = this.info();
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
