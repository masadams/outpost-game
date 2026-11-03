import { isShield } from '../sim/shieldConfig';
import { shieldActive } from '../sim/shields';
import { cargoCapacity, miningStats, tractorStats } from '../sim/shipStats';
import { NavigationPanel } from './Navigation';
import { CommandConsole } from './CommandConsole';
import { habitatSource } from '../sim/habitats';
import { habitatNotice } from './habitats';
import { OperationsDock } from './OperationsDock';
import { instrumentMarkup } from './instruments';
import { towingPanel } from './towing';
import { flightRegion, REGION_LABELS } from '../sim/flightRegion';
import { flightSafety } from '../sim/flightSafety';
import { hudContext, type DockView } from './context';
import { combatPanel } from './combat';
import { defencePanel } from './defence';
import type { ThreatPrediction } from '../sim/meteor';
import { ATMOSPHERE, WORLD } from '../sim/config';
import { telemetry, type Ship } from '../sim/physics';
import { localAngle, wrap } from '../sim/math';
import { inventoryMass, RESOURCES, RESOURCE_INFO } from '../sim/resources';
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
  private combatMarkup = '';
  private defenceMarkup = '';
  private nav: NavigationPanel;
  private command: CommandConsole;
  get shieldAccents(): boolean { return this.command.shieldAccents; }
  get selectedBuildingId(): number | null { return this.dock.root.dataset.panel === 'command' ? this.command.selected : null; }
  get buildPreview() { return this.dock.root.dataset.panel === 'command' ? this.command.preview : null; }
  private dock = new OperationsDock();
  destroy(): void { this.root.remove(); }
  toggleDock(view: DockView): void { this.dock.toggle(view); }
  closeDock(): void { this.dock.close(); }
  constructor(onColonyAction: (action: ColonyAction) => void) {
    this.nav = new NavigationPanel(onColonyAction); this.dock.navigation.append(this.nav.root);
    this.command = new CommandConsole(onColonyAction); this.dock.command.append(this.command.root);
    this.root.id = 'hud';
    this.root.innerHTML = `<header><div class="brand"><span class="eyebrow">SELENE / OUTPOST ALPHA 0.14</span><h1>OUTPOST <span id="hud-context">On pad</span><span id="flight-region" role="status" aria-live="polite"></span></h1></div><div class="mission">FLY · MINE · BUILD · DEFEND</div></header>
      <section class="instruments" aria-label="Flight telemetry"></section>
      <section class="notices"><div class="status" role="status" aria-live="polite"></div><div id="flight-alert" role="status" aria-live="polite" hidden></div><div id="threat-alert"></div></section>
      <div id="combat-status"></div>
      <footer><p class="context-hint"></p></footer>`;
    this.root.append(this.dock.nav, this.dock.root, this.nav.guidance); document.body.append(this.root);
    this.stats = this.root.querySelector('.instruments')!;
    this.status = this.root.querySelector('.status')!;
    this.mining = this.dock.cargo; this.colony = this.dock.colony;
    this.dock.root.addEventListener('click', event => {
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
    const context = hudContext(world); this.dock.update(context, world.playerMode);
    this.root.dataset.context = context.key;
    this.root.querySelector('#hud-context')!.textContent = context.label;
    this.root.querySelector('.context-hint')!.textContent = context.hint + (world.ship.towRig && world.playerMode === 'ship' ? ' · Y: latch / release tow' : '');
    const ship: Ship = world.ship;
    const onFoot = world.playerMode === 'astronaut';
    const region = flightRegion(onFoot ? world.astronaut.position : ship.position), regionBadge = this.root.querySelector<HTMLElement>('#flight-region')!;
    regionBadge.dataset.region = region;
    if (regionBadge.textContent !== REGION_LABELS[region]) regionBadge.textContent = REGION_LABELS[region];
    const t = onFoot ? telemetry({ ...world.astronaut, angle: localAngle(world.astronaut.position) }, SUIT.radius) : telemetry(ship);
    patchMarkup(this.stats, instrumentMarkup(world));
    const safety = flightSafety(ship), flightAlert = this.root.querySelector<HTMLElement>('#flight-alert')!;
    const flightMessage = onFoot || ship.state === 'crashed' ? '' : safety.message;
    if (flightAlert.textContent !== flightMessage) flightAlert.textContent = flightMessage;
    flightAlert.hidden = !flightMessage; flightAlert.dataset.level = safety.level;
    this.root.dataset.approach = String(!onFoot && safety.approach);
    this.root.dataset.warningPaused = String(paused || ship.state === 'crashed');
    const message = paused ? `PAUSED · ${world.notice.time > 0 ? `${world.notice.message} · ` : ''}P TO RESUME` : onFoot && world.astronaut.health <= 0 ? 'SUIT LOST · R TO RESTART' :
      !onFoot && ship.state === 'crashed' ? 'HULL LOST · BACKSPACE RECOVERS WITH SUPPLIES · L LOADS · R RESETS' : world.notice.time > 0 ? world.notice.message :
      world.defence.controlled !== null ? 'TURRET CONTROL · A/D AIM · SPACE FIRE · E RELEASE' :
      onFoot ? (!habitatSource(world) && world.astronaut.oxygen < 30 ? 'LOW OXYGEN · RETURN TO SHIP OR SERVICE' : habitatNotice(world)) :
      ship.impact > 0 ? 'IMPACT · HULL DAMAGE' : ship.state === 'landed' ?
      (ship.landings > 0 ? 'TOUCHDOWN CONFIRMED · W TO RELAUNCH' : 'PAD SECURED · HOLD W TO LAUNCH') :
      ship.fuel <= 0 ? 'FUEL EMPTY · COASTING' : t.altitude > ATMOSPHERE.height ? 'OPEN SPACE · RADIAL GRAVITY' : 'ATMOSPHERIC FLIGHT · GRAVITY + DRAG';
    if (this.status.textContent !== message) this.status.textContent = message;
    this.status.classList.toggle('danger', onFoot ? world.astronaut.health <= 0 || !habitatSource(world) && world.astronaut.oxygen < 30 : ship.state === 'crashed' || ship.impact > 0);
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
    const combatStatus = this.root.querySelector('#combat-status')!, arm = ship.armament;
    const combatText = world.playerMode === 'ship' ? `${arm.selected.toUpperCase()} ${arm[arm.selected]} · CELL ${arm.energy.toFixed(0)} · HEAT ${arm.heat.toFixed(0)}${arm.overheated ? ' · COOLING LOCK' : ''}` : '';
    if (combatStatus.textContent !== combatText) combatStatus.textContent = combatText;
    const hostiles = world.combat.enemies.length ? `${warning ? ' · ' : ''}${world.combat.enemies.length} HOSTILE${world.combat.enemies.every(d => d.state === 'retreat') ? ' · DISENGAGING' : world.combat.enemies.some(d => d.windup > 0) ? ' · DRONE AIMING' : ' · APPROACHING'}` : '';
    const emitters = world.colony.buildings.filter(b => isShield(b.kind)), active = emitters.filter(shieldActive).length;
    const protection = emitters.length && (warning || hostiles || emitters.some(b => b.status === 'shield breached')) ? `${warning || hostiles ? ' · ' : ''}SHIELDS ${active}/${emitters.length} ACTIVE${emitters.some(b => b.status === 'shield breached') ? ' · BREACHED' : ''}` : '';
    if (alert.textContent !== warning + hostiles + protection) alert.textContent = warning + hostiles + protection;
    this.updateMining(world);
    this.nav.update(world, paused, !this.dock.navigation.hidden);
    if (!this.dock.command.hidden) this.command.update(world, paused);
    const panel = colonyPanel(world, paused);
    if (this.colonyMarkup !== panel) { patchMarkup(this.colony, panel); this.colonyMarkup = panel; }
    const combat = combatPanel(world, paused), defence = defencePanel(world, paused, threats);
    if (combat !== this.combatMarkup) { patchMarkup(this.dock.combat, combat); this.combatMarkup = combat; }
    if (defence !== this.defenceMarkup) { patchMarkup(this.dock.defence, defence); this.defenceMarkup = defence; }
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
    patchMarkup(this.mining, `<label>HOLD / DEPOT · kg</label><strong>${cargo.toFixed(1)} <small>/ ${cargoCapacity(world.ship)} kg</small></strong>
      <div class="cargo-meter"><i style="width:${cargo / cargoCapacity(world.ship) * 100}%"></i></div>
      ${RESOURCES.map(type => `<div class="resource"><span>${RESOURCE_INFO[type].label}</span><span>${world.ship.cargo[type].toFixed(1)} / ${world.depot[type].toFixed(1)}</span></div>`).join('')}
      ${world.playerMode === 'astronaut' ? surfacePanel(world) : `<p class="objective">${objective}</p><div class="target"><label>NEAREST DEPOSIT</label>${nearest && delta ? `${RESOURCE_INFO[nearest.resource].label} · ${Math.hypot(delta.x, delta.y).toFixed(0)} m<br><small>${Math.abs(bearing).toFixed(0)}° ${bearing < 0 ? 'left' : 'right'} of nose · laser ${miningStats(world.ship).range} m</small>` : 'Field depleted'}</div>
      <small>${cargo >= cargoCapacity(world.ship) ? 'HOLD FULL · return and unload' : world.tractorActive ? `TRACTOR ACTIVE · ${tractorStats(world.ship).range} m` : 'C: tractor · SPACE: laser'}</small>`}${towingPanel(world, this.root.dataset.state === 'paused')}`);
    this.root.dataset.cargo = cargo.toFixed(2); this.root.dataset.depot = stored.toFixed(2);
    this.root.dataset.asteroids = String(world.asteroids.length); this.root.dataset.pickups = String(world.pickups.length);
    this.root.dataset.mining = world.beam ? 'active' : 'idle';
  }
}
