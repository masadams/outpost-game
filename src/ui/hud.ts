import type { ThreatPrediction } from '../sim/meteor';
import { ATMOSPHERE, WORLD } from '../sim/config';
import { telemetry, type Ship } from '../sim/physics';
import { localAngle, wrap } from '../sim/math';
import { CARGO_CAPACITY, inventoryMass, RESOURCES, RESOURCE_INFO } from '../sim/resources';
import type { WorldState } from '../sim/world';
import { SUIT } from '../sim/astronaut';
import { surfacePanel } from './surface';
import { colonyPanel, actionFromButton } from './colony';
import type { ColonyAction } from '../sim/colony';
import { patchMarkup } from './dom';
export class Hud {
  private root = document.createElement('div');
  private stats: HTMLElement;
  private status: HTMLElement;
  private mining: HTMLElement;
  private colony: HTMLElement;
  private colonyMarkup = '';
  destroy(): void { this.root.remove(); }
  constructor(onColonyAction: (action: ColonyAction) => void) {
    this.root.id = 'hud';
    this.root.innerHTML = `<header><div><span class="eyebrow">PLAYTEST ALPHA / 0.3</span><h1>OUTPOST<span>✦</span></h1></div><div class="mission">SELENE · OUTPOST ALPHA<br><small>Mine → refine → build → refuel</small></div></header>
      <section class="instruments" aria-label="Flight telemetry"></section>
      <div class="status" role="status" aria-live="polite"></div>
      <div id="threat-alert"></div>
      <aside class="mining" aria-label="Cargo and mining telemetry"></aside>
      <aside class="colony-panel" aria-label="Colony construction and production"></aside>
      <footer><div><b>FLIGHT / COLONY MANUAL</b><p><kbd>W / ↑</kbd> thrust &nbsp; <kbd>A D / ← →</kbd> rotate / walk<br><kbd>SPACE</kbd> mine / jump &nbsp; <kbd>C</kbd> tractor &nbsp; <kbd>E</kbd> unload / interact<br><kbd>F</kbd> board / exit &nbsp; <kbd>B</kbd> build &nbsp; <kbd>K / L</kbd> save / load &nbsp; <kbd>P</kbd> pause &nbsp; <kbd>R</kbd> reset</p></div><div class="landing-guide">TOUCHDOWN ENVELOPE<br><small>Descent ≤ 6 m/s · Drift ≤ 4 m/s<br>Tilt ≤ 15° · Settle rotation before contact</small></div></footer>`;
    document.body.append(this.root);
    this.stats = this.root.querySelector('.instruments')!;
    this.status = this.root.querySelector('.status')!;
    this.mining = this.root.querySelector('.mining')!;
    this.colony = this.root.querySelector('.colony-panel')!;
    this.colony.addEventListener('keydown', event => {
      if (['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.stopPropagation();
    });
    this.colony.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!button || button.disabled) return;
      const action = actionFromButton(button);
      if (action) {
        if (event.detail > 0 || action.type === 'controlTurret') button.blur();
        onColonyAction(action);
      }
    });
  }
  update(world: WorldState, paused: boolean, threats: ThreatPrediction[] = []): void {
    const ship: Ship = world.ship;
    const onFoot = world.playerMode === 'astronaut';
    const t = onFoot ? telemetry({ ...world.astronaut, angle: localAngle(world.astronaut.position) }, SUIT.radius) : telemetry(ship);
    this.stats.innerHTML = [ ['ALTITUDE', `${t.altitude.toFixed(0)}<small> m</small>`],
      ['RADIAL', `${t.radial.toFixed(1)}<small> m/s</small>`], ['DRIFT', `${t.tangential.toFixed(1)}<small> m/s</small>`],
      ['SPEED', `${t.speed.toFixed(1)}<small> m/s</small>`],
      [onFoot ? 'OXYGEN' : 'FUEL', `${((onFoot ? world.astronaut.oxygen / SUIT.oxygen : ship.fuel / WORLD.fuelCapacity) * 100).toFixed(0)}<small> %</small>`],
      [onFoot ? 'SUIT' : 'HULL', `${(onFoot ? world.astronaut.health : ship.hull).toFixed(0)}<small> %</small>`],
      [onFoot ? 'FOOTING' : 'TILT', onFoot ? world.astronaut.grounded ? 'GROUND' : 'AIR' : `${(t.tilt * 180 / Math.PI).toFixed(0)}<small> °</small>`] ].map(([label, value]) => `<div><label>${label}</label><strong>${value}</strong></div>`).join('');
    const message = paused ? `PAUSED · ${world.notice.time > 0 ? `${world.notice.message} · ` : ''}P TO RESUME` : onFoot && world.astronaut.health <= 0 ? 'SUIT LOST · R TO RESTART' :
      !onFoot && ship.state === 'crashed' ? 'HULL LOST · R TO RESTART' : world.notice.time > 0 ? world.notice.message :
      world.defence.controlled !== null ? 'TURRET CONTROL · A/D AIM · SPACE FIRE · E RELEASE' :
      onFoot ? (world.astronaut.oxygen < 30 ? 'LOW OXYGEN · RETURN TO SHIP OR SERVICE' : 'ON FOOT · A/D WALK · SPACE JUMP · F BOARD') :
      ship.impact > 0 ? 'IMPACT · HULL DAMAGE' : ship.state === 'landed' ?
      (ship.landings > 0 ? 'TOUCHDOWN CONFIRMED · W TO RELAUNCH' : 'PAD SECURED · HOLD W TO LAUNCH') :
      ship.fuel <= 0 ? 'FUEL EMPTY · COASTING' : t.altitude > ATMOSPHERE.height ? 'OPEN SPACE · RADIAL GRAVITY' : 'ATMOSPHERIC FLIGHT · GRAVITY + DRAG';
    if (this.status.textContent !== message) this.status.textContent = message;
    this.status.classList.toggle('danger', onFoot ? world.astronaut.health <= 0 || world.astronaut.oxygen < 30 : ship.state === 'crashed' || ship.impact > 0);
    this.root.dataset.state = paused ? 'paused' : ship.state;
    this.root.dataset.altitude = t.altitude.toFixed(1);
    this.root.dataset.fuel = ship.fuel.toFixed(2);
    this.root.dataset.tilt = (t.tilt * 180 / Math.PI).toFixed(1);
    this.root.dataset.mode = world.playerMode;
    this.root.dataset.grounded = String(world.astronaut.grounded);
    this.root.dataset.oxygen = world.astronaut.oxygen.toFixed(2);
    this.root.dataset.suitHealth = world.astronaut.health.toFixed(1);
    this.root.dataset.surfaceAngle = localAngle(world.astronaut.position).toFixed(4);
    this.root.dataset.depotOpen = String(world.depotOpen);
    const incoming = threats.filter(t => t.impact).sort((a, b) => a.seconds - b.seconds)[0];
    const alert = this.root.querySelector('#threat-alert')!;
    const warning = world.defence.meteors.length ? `⚠ ${world.defence.meteors.length} INCOMING${incoming ? ` · IMPACT ${incoming.seconds.toFixed(0)} s` : ''}` : '';
    if (alert.textContent !== warning) alert.textContent = warning;
    this.updateMining(world);
    const panel = colonyPanel(world, paused, threats);
    if (this.colonyMarkup !== panel) { patchMarkup(this.colony, panel); this.colonyMarkup = panel; }
    this.root.dataset.buildings = String(world.colony.buildings.length);
    this.root.dataset.buildOpen = String(world.colony.buildOpen);
    this.root.dataset.energy = world.colony.energy.toFixed(2);
    this.root.dataset.fuelStock = world.colony.products.fuel.toFixed(2);
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
      ${world.playerMode === 'astronaut' ? surfacePanel(world) : `<p class="objective">${objective}</p><div class="target"><label>NEAREST DEPOSIT</label>${nearest && delta ? `${RESOURCE_INFO[nearest.resource].label} · ${Math.hypot(delta.x, delta.y).toFixed(0)} m<br><small>${Math.abs(bearing).toFixed(0)}° ${bearing < 0 ? 'left' : 'right'} of nose · laser 450 m</small>` : 'Field depleted'}</div>
      <small>${cargo >= CARGO_CAPACITY ? 'HOLD FULL · return and unload' : world.tractorActive ? 'TRACTOR ACTIVE · 260 m' : 'C: tractor · SPACE: laser'}</small>`}`;
    this.root.dataset.cargo = cargo.toFixed(2); this.root.dataset.depot = stored.toFixed(2);
    this.root.dataset.asteroids = String(world.asteroids.length); this.root.dataset.pickups = String(world.pickups.length);
    this.root.dataset.mining = world.beam ? 'active' : 'idle';
  }
}
