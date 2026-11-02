import { WORLD } from '../sim/config';
import { telemetry, type Ship } from '../sim/physics';
export class Hud {
  private root = document.createElement('div');
  private stats: HTMLElement;
  private status: HTMLElement;
  constructor() {
    this.root.id = 'hud';
    this.root.innerHTML = `<header><div><span class="eyebrow">FLIGHT PROVING GROUND / 001</span><h1>OUTPOST<span>✦</span></h1></div><div class="mission">SELENE · OUTPOST ALPHA<br><small>Launch → explore → return to pad</small></div></header>
      <section class="instruments" aria-label="Flight telemetry"></section>
      <div class="status" role="status" aria-live="polite"></div>
      <footer><div><b>FLIGHT MANUAL</b><p><kbd>W / ↑</kbd> thrust &nbsp; <kbd>A D / ← →</kbd> rotate<br><kbd>P</kbd> pause &nbsp; <kbd>R</kbd> restart</p></div><div class="landing-guide">TOUCHDOWN ENVELOPE<br><small>Descent ≤ 6 m/s · Drift ≤ 4 m/s<br>Tilt ≤ 15° · Settle rotation before contact</small></div></footer>`;
    document.body.append(this.root);
    this.stats = this.root.querySelector('.instruments')!;
    this.status = this.root.querySelector('.status')!;
  }
  update(ship: Ship, paused: boolean): void {
    const t = telemetry(ship);
    this.stats.innerHTML = [ ['ALTITUDE', `${t.altitude.toFixed(0)}<small> m</small>`],
      ['RADIAL', `${t.radial.toFixed(1)}<small> m/s</small>`], ['DRIFT', `${t.tangential.toFixed(1)}<small> m/s</small>`],
      ['SPEED', `${t.speed.toFixed(1)}<small> m/s</small>`], ['FUEL', `${(ship.fuel / WORLD.fuelCapacity * 100).toFixed(0)}<small> %</small>`],
      ['HULL', `${ship.hull.toFixed(0)}<small> %</small>`], ['TILT', `${(t.tilt * 180 / Math.PI).toFixed(0)}<small> °</small>`] ].map(([label, value]) => `<div><label>${label}</label><strong>${value}</strong></div>`).join('');
    const message = paused ? 'PAUSED · P TO RESUME' : ship.state === 'crashed' ? 'HULL LOST · R TO RESTART' :
      ship.impact > 0 ? 'IMPACT · HULL DAMAGE' : ship.state === 'landed' ?
      (ship.landings > 0 ? 'TOUCHDOWN CONFIRMED · W TO RELAUNCH' : 'PAD SECURED · HOLD W TO LAUNCH') :
      ship.fuel <= 0 ? 'FUEL EMPTY · COASTING' : t.altitude > 900 ? 'OPEN SPACE · INERTIAL FRAME' : 'FREE FLIGHT · LOCAL GRAVITY';
    if (this.status.textContent !== message) this.status.textContent = message;
    this.status.classList.toggle('danger', ship.state === 'crashed' || ship.impact > 0);
    this.root.dataset.state = paused ? 'paused' : ship.state;
    this.root.dataset.altitude = t.altitude.toFixed(1);
    this.root.dataset.fuel = ship.fuel.toFixed(2);
    this.root.dataset.tilt = (t.tilt * 180 / Math.PI).toFixed(1);
  }
}
