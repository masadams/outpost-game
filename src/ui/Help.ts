export class Help {
  private dialog = document.createElement('dialog');
  constructor(private onToggle: (open: boolean) => void) {
    this.dialog.id = 'help'; this.dialog.setAttribute('aria-label', 'Outpost quick-start and controls');
    this.dialog.innerHTML = `<div class="help-title"><span class="eyebrow">OUTPOST · PLAYTEST ALPHA 0.1</span><button type="button">Return to game [H / Esc]</button></div>
      <h2>Your first sortie</h2><p>Launch from the green pad, mine ore, land, then build a small working colony. Everything shares one continuous moon.</p>
      <ol><li><b>Fly:</b> hold W / Up for about 6.5 seconds, then coast. A/D or arrows rotate. Momentum continues when the engine stops.</li>
      <li><b>Return:</b> keep the nose upright, pulse thrust early during descent. Touch down on green with descent ≤ 6 m/s, drift ≤ 4 m/s, tilt ≤ 15°. R recovers from a crash.</li>
      <li><b>Mine:</b> Space fires forward. Hold C to attract ore within 260 m. The starter iron sample is above home; ice is slightly right. Release thrust after the short launch burn so you can return.</li>
      <li><b>Explore:</b> F exits a landed ship or boards within 20 m. A/D walks, Space or W jumps. E uses the depot to the right or the emergency suit service to the left. Watch oxygen.</li>
      <li><b>Build:</b> walk right past the depot, B opens the palette. Enter builds solar; T shifts the preview; 4 + Enter builds a refinery, T then 5 + Enter adds fuel processing. V changes a nearby refinery recipe; E toggles machines. Mine ice to replenish fuel feedstock.</li></ol>
      <h2>Keep your progress</h2><p><b>K saves · L loads</b> a local checkpoint. Reload restores it paused; P resumes. <b>R resets runtime progress</b> but keeps that saved checkpoint. There is no autosave. Save before experimenting.</p>
      <p><b>P</b> pauses · <b>H / Esc</b> closes this guide · <b>M</b> mutes · volume is in the top bar. Sound starts after your first click/key and stops on pause or focus loss.</p>
      <p class="help-note">First playtest: try flight, mining, walking, production and save/load. Buildings are non-solid, the power/material bus is global, solar is constant, and defence/combat are not in this build.</p>`;
    document.body.append(this.dialog);
    this.dialog.addEventListener('keydown', event => { if (['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.stopPropagation(); });
    this.dialog.querySelector('button')!.addEventListener('click', () => this.close());
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
  }
  get isOpen(): boolean { return this.dialog.open; }
  toggle(): void { if (this.isOpen) this.close(); else { this.onToggle(true); this.dialog.showModal(); } }
  close(): void { if (this.dialog.open) { this.dialog.close(); this.onToggle(false); } }
  destroy(): void { this.dialog.remove(); }
}
