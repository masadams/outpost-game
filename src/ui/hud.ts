import { WORLD } from '../sim/config';
import { telemetry, type Ship } from '../sim/physics';
import { localAngle, wrap } from '../sim/math';
import { CARGO_CAPACITY, inventoryMass, RESOURCES, RESOURCE_INFO } from '../sim/resources';
import type { WorldState } from '../sim/world';
export class Hud {
  private root = document.createElement('div');
  private stats: HTMLElement;
  private status: HTMLElement;
  private mining: HTMLElement;
  constructor() {
    this.root.id = 'hud';
    this.root.innerHTML = `<header><div><span class="eyebrow">RESOURCE PROVING GROUND / 002</span><h1>OUTPOST<span>✦</span></h1></div><div class="mission">SELENE · OUTPOST ALPHA<br><small>Launch → mine → collect → unload</small></div></header>
      <section class="instruments" aria-label="Flight telemetry"></section>
      <div class="status" role="status" aria-live="polite"></div>
      <aside class="mining" aria-label="Cargo and mining telemetry"></aside>
      <footer><div><b>FLIGHT / MINING MANUAL</b><p><kbd>W / ↑</kbd> thrust &nbsp; <kbd>A D / ← →</kbd> rotate<br><kbd>SPACE</kbd> mine &nbsp; <kbd>C</kbd> tractor &nbsp; <kbd>E</kbd> unload on pad<br><kbd>P</kbd> pause &nbsp; <kbd>R</kbd> reset entire sortie</p></div><div class="landing-guide">TOUCHDOWN ENVELOPE<br><small>Descent ≤ 6 m/s · Drift ≤ 4 m/s<br>Tilt ≤ 15° · Settle rotation before contact</small></div></footer>`;
    document.body.append(this.root);
    this.stats = this.root.querySelector('.instruments')!;
    this.status = this.root.querySelector('.status')!;
    this.mining = this.root.querySelector('.mining')!;
  }
  update(world: WorldState, paused: boolean): void {
    const ship: Ship = world.ship;
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
    this.updateMining(world);
  }
  private updateMining(world: WorldState): void {
    const cargo = inventoryMass(world.ship.cargo), stored = inventoryMass(world.depot);
    const nearest = world.asteroids.reduce<typeof world.asteroids[number] | null>((best, rock) => {
      const distance = Math.hypot(rock.position.x - world.ship.position.x, rock.position.y - world.ship.position.y);
      const bestDistance = best ? Math.hypot(best.position.x - world.ship.position.x, best.position.y - world.ship.position.y) : Infinity;
      return distance < bestDistance ? rock : best;
    }, null);
    const delta = nearest ? { x: nearest.position.x - world.ship.position.x, y: nearest.position.y - world.ship.position.y } : null;
    const bearing = delta ? wrap(localAngle(delta) - world.ship.angle) * 180 / Math.PI : 0;
    const objective = cargo > 0 ? (world.ship.state === 'landed' ? 'PRESS E TO UNLOAD' : 'ORE SECURED · return to green pad') :
      stored > 0 ? 'DELIVERY CONFIRMED · launch for more' : 'Mine fragments, then hold C nearby';
    this.mining.innerHTML = `<label>HOLD / DEPOT · kg</label><strong>${cargo.toFixed(1)} <small>/ ${CARGO_CAPACITY} kg</small></strong>
      <div class="cargo-meter"><i style="width:${cargo / CARGO_CAPACITY * 100}%"></i></div>
      ${RESOURCES.map(type => `<div class="resource"><span>${RESOURCE_INFO[type].label}</span><span>${world.ship.cargo[type].toFixed(1)} / ${world.depot[type].toFixed(1)}</span></div>`).join('')}
      <p class="objective">${objective}</p><div class="target"><label>NEAREST DEPOSIT</label>${nearest && delta ? `${RESOURCE_INFO[nearest.resource].label} · ${Math.hypot(delta.x, delta.y).toFixed(0)} m<br><small>${Math.abs(bearing).toFixed(0)}° ${bearing < 0 ? 'left' : 'right'} of nose · laser 450 m</small>` : 'Field depleted'}</div>
      <small>${cargo >= CARGO_CAPACITY ? 'HOLD FULL · return and unload' : world.tractorActive ? 'TRACTOR ACTIVE · 260 m' : 'C: tractor · SPACE: laser'}</small>`;
    this.root.dataset.cargo = cargo.toFixed(2); this.root.dataset.depot = stored.toFixed(2);
    this.root.dataset.asteroids = String(world.asteroids.length); this.root.dataset.pickups = String(world.pickups.length);
    this.root.dataset.mining = world.beam ? 'active' : 'idle';
  }
}
