import { isolateControlKeys } from './controlKeys';
export class Help {
  private dialog = document.createElement('dialog');
  constructor(private onToggle: (open: boolean) => void) {
    this.dialog.id = 'help'; this.dialog.setAttribute('aria-label', 'Outpost quick-start and controls');
    this.dialog.innerHTML = `<div class="help-title"><span>How to play</span><button type="button" aria-label="Return to game">Return to game <kbd aria-hidden="true">Esc</kbd></button></div>${FOCUS_HELP}`;
    document.body.append(this.dialog);
    isolateControlKeys(this.dialog);
    this.dialog.querySelector('button')!.addEventListener('click', () => this.close());
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
  }
  get isOpen(): boolean { return this.dialog.open; }
  toggle(): void { if (this.isOpen) this.close(); else { this.onToggle(true); this.dialog.showModal(); } }
  close(): void { if (this.dialog.open) { this.dialog.close(); (document.activeElement as HTMLElement)?.blur(); this.onToggle(false); } }
  destroy(): void { this.dialog.remove(); }
}

/** Short guide for the first mining sortie (focus feature set). */
const FOCUS_HELP = `
      <h2>Your first sortie</h2>
      <p>You start landed on the pad at your outpost on Selene. Mine ore from the rocks above, bring it home, and use it to build.</p>
      <h2>Fly</h2>
      <p><b>W</b> fires the main engine. <b>A / D</b> turn. Gravity always pulls toward the planet's center, so tilt to move sideways and keep some fuel for the landing.</p>
      <p>The bottom gauges show your altitude, descent speed, drift and tilt. Land gently on the green pad: slow descent, little drift, nose up. You can land anywhere else too, but open ground needs an even gentler touchdown (the limits on your gauges change when you are not over the pad).</p>
      <h2>Mine</h2>
      <p>Point the nose at a rock and hold <b>Space</b> to cut it apart. Hold <b>C</b> nearby to pull the fragments into your hold. A full hold makes the lander heavier and slower to stop.</p>
      <h2>Unload and build</h2>
      <p>Land on the pad and press <b>E</b> to unload ore. Press <b>F</b> to step out, walk with <b>A / D</b>, and press <b>B</b> to build. Pick a building, point at the ground and click to place it. Your astronaut walks over and builds it.</p>
      <p>Start with a <b>Solar array</b> for power and a <b>Refinery</b> to turn ore into alloy and wire. Add <b>Storage</b> and a <b>Battery</b> as you grow. A <b>Fuel processor</b> turns refined water and oxygen into fuel.</p>
      <h2>Day and night</h2>
      <p>Selene turns once every 17 minutes or so. Solar panels only work in daylight, so build a <b>Battery</b> before your first night. The chip under the objective says when dusk or dawn comes. The ground, and everything on it, moves with the planet: drift on your gauges is measured against the ground, so a straight hop lands where it left.</p>
      <h2>The storm</h2>
      <p>Build an <b>Observatory</b> and power it. It finds rocks heading your way and, the longer it watches, the better it can tell when and where they will land. Build a <b>Laser turret</b> near your buildings and turn on <b>Auto defence</b> on its card, or cut rocks apart with your own laser. In <b>Base</b>, <b>Keep for turrets</b> holds power back so the Observatory and refinery cannot drain it. After the storm, walk over the pieces on the ground and analyse one in Base.</p>
      <p>Right-click any building for its menu. <b>Demolish</b> asks first and gives back part of the materials.</p>
      <h2>As you grow</h2>
      <p><b>Base</b> shows every building, what it is doing and what it needs. Build a <b>Research lab</b> and open the research tree there: each technology costs materials and lab time, and some only open once something has happened. Ship parts are built and fitted at the home pad from <b>Ship</b>. The <b>Map</b> shows the worlds you have found and where your pods are.</p>
      <p>New blueprints are announced when they become available. The Journal (the card at top left) records what has happened so far.</p>
      <h2>If things go wrong</h2>
      <p>Your pilots are printed at the base. If you lose the lander, press <b>Backspace</b> to print a new pilot and lander on the pad for 8 alloy and 2 components. The old lander stays where it fell, with what survived: its transponder shows it on the Map for an hour, so you can go back and salvage it with <b>E</b>. Press <b>K</b> to save and <b>L</b> to load.</p>
      <h2>Controls</h2>
      <p><b>P</b> pause · <b>I</b> ship and cargo · <b>H / Esc</b> close this guide · <b>M</b> mute · <b>J</b> coast path · <b>+ / −</b> zoom. Change any key in Settings.</p>`;
