export class Help {
  private dialog = document.createElement('dialog');
  constructor(private onToggle: (open: boolean) => void) {
    this.dialog.id = 'help'; this.dialog.setAttribute('aria-label', 'Outpost quick-start and controls');
    this.dialog.innerHTML = `<div class="help-title"><span class="eyebrow">OUTPOST · PLAYTEST ALPHA 0.3</span><button type="button">Return to game [H / Esc]</button></div>
      <h2>Your first sortie</h2><p>Launch from the green pad, mine ore, land, then build a small working colony on the larger planet and its 1.2 km atmosphere.</p>
      <ol><li><b>Fly:</b> hold W / Up for about 6.5 seconds for a low atmospheric hop, then coast. Hold Space to clear the starter rock above home, or steer around it. A/D or arrows rotate. Gravity acts everywhere; air resistance fades to zero in space.</li>
      <li><b>Return:</b> keep the nose upright, pulse thrust early during descent. Touch down on green with descent ≤ 6 m/s, drift ≤ 4 m/s, tilt ≤ 15°. R recovers from a crash.</li>
      <li><b>Mine:</b> Space fires forward. Hold C to attract ore within 260 m. The starter iron sample is above home; ice is slightly right. Release thrust after the short launch burn so you can return.</li>
      <li><b>Explore:</b> F exits a landed ship or boards within 20 m. A/D walks, Space or W jumps. E uses the depot to the right or the emergency suit service to the left. Watch oxygen.</li>
      <li><b>Build:</b> walk right past the depot, B opens the palette. Enter builds solar; T shifts the preview; 4 + Enter builds a refinery, T then 5 + Enter adds fuel processing. V changes a nearby refinery recipe; E toggles machines. Mine ice to replenish fuel feedstock.</li></ol>
      <p><b>J</b> toggles the dashed coast path: controls released, gravity + drag, up to 180 seconds, stopping at terrain contact. It excludes moving rocks/tools. The arrow shows current velocity. <b>Wheel / − / +</b> sets manual zoom; <b>0</b> restores altitude-based auto zoom. Zoom also works while paused. Try a roughly 10-second vertical burn for a higher coast through the atmosphere; watch the prediction before extending a burn.</p>
      <h2>Defend the colony</h2><p>Build solar and a <b>7 laser / 8 flak / 9 missile turret</b>. Walk within 18 m and <b>E</b> to control it: A/D aims, Space fires, E releases. <b>G</b> toggles automatic targeting for the nearby turret; release manual control for it to run unattended. Lasers use grid energy; flak spends alloy, missiles spend alloy/components too. <b>U</b> repairs nearby buildings with alloy.</p>
      <p><b>K saves before a drill. N starts an incoming meteor drill with real damage</b>; drills never start automatically. Orange paths/markers and the radar show predicted impacts. Large meteors split into dangerous fragments: keep firing. You can also intercept with the ship's mining laser. Wrecked facilities stop operating; destroyed storage can lose overflow stock. There are no shields yet.</p>
      <h2>Keep your progress</h2><p><b>K saves · L loads</b> a local checkpoint. Reload restores it paused; P resumes. <b>R resets runtime progress</b> but keeps that saved checkpoint. There is no autosave. Save before experimenting.</p>
      <p><b>P</b> pauses · <b>H / Esc</b> closes this guide · <b>M</b> mutes · volume is in the top bar. Sound starts after your first click/key and stops on pause or focus loss.</p>
      <p class="help-note">First playtest: try flight, mining, walking, production and save/load. Buildings are non-solid but can take meteor damage, the power/material bus is global, and solar is constant. Hostile spacecraft combat is a later phase.</p>`;
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
