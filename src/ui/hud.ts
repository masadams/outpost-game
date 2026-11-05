import {BuildingLabels} from './BuildingLabels';
import {autopilotPanel} from './autopilot';
import {UPGRADE_IDS,type UpgradeId} from '../sim/progressionConfig';
import type {PointerView} from '../render/pointer';
import { readinessPanel } from './readiness';
import { BLUEPRINTS } from '../sim/colonyConfig';
import { isolateControlKeys } from './controlKeys';
import { orderError } from '../sim/construction';
import { BuildBar } from './build/BuildBar';
import { BaseWindow, type BaseSection } from './base/BaseWindow';
import { baseView, buildingView } from './base/baseView';
import { NearbyCard } from './base/NearbyCard';
import { nearbyBuilding } from '../sim/colony';
import { buildingHealth } from '../sim/buildingHealth';
import { featureVisible } from '../preferences/features';
import { buildView, placementTip, type BuildGroup } from './build/buildView';
import type { BuildDraft } from './build/buildDraft';
import type { Vec } from '../sim/math';
import { Objectives } from './Objectives';
import { controlHint, type PresentationPreferences } from '../preferences/presentation';
import { freightPanel } from './freight';
import { colonyPlanet, localAngleAt } from '../sim/localWorld';
import { cargoMass } from '../sim/shipMass';
import { isShield } from '../sim/shieldConfig';
import { shieldActive } from '../sim/shields';
import { cargoCapacity, miningStats, tractorStats } from '../sim/shipStats';
import { NavigationPanel } from './Navigation';
import { CommandConsole } from './CommandConsole';
import { habitatSource } from '../sim/habitats';
import { habitatNotice } from './habitats';
import { OperationsDock } from './OperationsDock';
import { InstrumentPanel } from './InstrumentPanel';
import { towingPanel } from './towing';
import { flightRegion, REGION_LABELS } from '../sim/flightRegion';
import { flightSafety } from '../sim/flightSafety';
import { hudContext, type DockView } from './context';
import { combatPanel } from './combat';
import { defencePanel } from './defence';
import type { ThreatPrediction } from '../sim/meteor';
import { WORLD } from '../sim/config';
import { telemetry, type Ship } from '../sim/physics';
import { localAngle, wrap } from '../sim/math';
import { inventoryMass, RESOURCES, RESOURCE_INFO } from '../sim/resources';
import type { WorldState } from '../sim/world';
import { SUIT } from '../sim/astronaut';
import { surfacePanel } from './surface';
import { colonyPanel, actionFromButton } from './colony';
import type { ColonyAction } from '../sim/colony';
import { setText, patchMarkup } from './dom';
export class Hud {
  private root = document.createElement('div');
  private instruments: InstrumentPanel;
  private status: HTMLElement;
  private mining: HTMLElement;
  private colony: HTMLElement;
  private colonyMarkup = '';
  private combatMarkup = '';
  private defenceMarkup = '';
  private nav: NavigationPanel;
  private command: CommandConsole;
  get shieldAccents(): boolean { return this.command.shieldAccents; }
  get selectedBuildingId(): number | null {
    if (this.dock.root.dataset.panel !== 'command') return null;
    return this.baseSection === 'legacy' ? this.command.selected : this.baseSection === 'buildings' ? this.baseSelected : null;
  }
  private latestWorld:WorldState|null=null;
  private pointerDraft:BuildDraft|null=null;
  private buildBar!: BuildBar;
  private base!: BaseWindow;
  private nearby!: NearbyCard;
  private baseSection: BaseSection = featureVisible('catalogue') ? 'legacy' : 'overview';
  private baseSelected: number | null = null;
  private buildGroup: BuildGroup = 'power';
  private onAction!: (action: ColonyAction) => void;
  private fuelPlanAmount=20;
  private labels=new BuildingLabels((body,id)=>this.selectFacility(body,id));
  private autopilotWasActive=false;
  updateBuildingLabels(w:WorldState,view:PointerView):void{this.labels.update(w,view,this.preferences.buildingLabels,this.selectedBuildingId,this.preferences.textScale);}
  /** Build mode is a world flag; the mouse places sites whenever it is on. */
  get pointerBuilding():boolean{return !!this.latestWorld?.colony.buildOpen;}
  get buildPointer():BuildDraft|null{return this.pointerDraft;}
  setBuildPointer(w:WorldState,at:Vec,zoom:number):void{if(!this.pointerBuilding){this.pointerDraft=null;return;}const body=colonyPlanet(w),x=at.x-body.position.x,y=at.y-body.position.y,angle=Math.atan2(x,-y),inputError=Math.abs(Math.hypot(x,y)-body.radius)>Math.max(60,30/zoom)?'Point near this world’s surface':null,error=inputError??orderError(w,w.colony.selected,angle);this.pointerDraft={kind:w.colony.selected,angle,body:body.id,valid:!error,error,inputError};}
  showBuildTip(x:number,y:number):void{
    const d=this.pointerDraft,w=this.latestWorld;
    if(!d||!w||!this.pointerBuilding){this.buildBar.tip(null);return;}
    this.buildBar.tip({...placementTip(w,d.kind,d.error),x,y});
  }
  hideBuildTip():void{this.buildBar.tip(null);}
  clearBuildPointer():void{this.pointerDraft=null;this.hideBuildTip();}
  get buildPreview() { if(this.pointerBuilding&&this.pointerDraft)return this.pointerDraft; return this.dock.root.dataset.panel === 'command' ? this.command.preview ? { ...this.command.preview, body: this.command.bodyId } : null : null; }
  private dock = new OperationsDock();
  private objectives = new Objectives((link,keyboard)=>{if(link==='research'||link==='equipment'){this.baseSection='legacy';this.dock.open('command');this.command.openSection(link,keyboard);}else{if(link==='build'){this.dock.close();this.onAction({type:'buildMode',open:true});return;}const view=({cargo:'cargo',map:'navigation',defence:'defence'} as const)[link];this.dock.open(view);}if(keyboard)this.dock.root.querySelector<HTMLButtonElement>('.dock-heading button')?.focus();});
  destroy(): void { this.root.remove(); }
  toggleDock(view: DockView): void { this.dock.toggle(view); }
  /** Screen buttons in the flight chrome. Build toggles build mode; the others open their panel. */
  chooseScreen(view: DockView): void {
    if (view !== 'colony') { this.dock.choose(view); return; }
    const open = !this.latestWorld?.colony.buildOpen;
    if (open) this.dock.close();
    this.onAction({ type: 'buildMode', open });
  }
  private renderBase(paused = this.root.dataset.state === 'paused'): void {
    const world = this.latestWorld;
    if (!world) return;
    const legacy = featureVisible('catalogue');
    if (!legacy && this.baseSection === 'legacy') this.baseSection = 'overview';
    this.base.update({ view: baseView(world), section: this.baseSection, selected: this.baseSelected, paused, legacy });
    const slot = this.base.legacySlot;
    if (legacy && slot && this.command.root.parentElement !== slot) slot.append(this.command.root);
    if (this.baseSection === 'legacy') this.command.update(world, paused);
  }
  /** Focus set: the building you stand next to gets a small card instead of the old facility panel. */
  private renderNearby(world: WorldState, paused: boolean): void {
    const near = featureVisible('catalogue') || world.playerMode !== 'astronaut' || world.colony.buildOpen ? undefined : nearbyBuilding(world);
    this.nearby.update(near ? { building: buildingView(near), damaged: buildingHealth(near) < 100, paused } : null);
  }
  private renderBuild(world: WorldState): void {
    const open = world.colony.buildOpen;
    this.root.dataset.building = String(open);
    this.buildBar.update(open ? buildView(world, this.buildGroup) : null);
    if (!open) this.buildBar.tip(null);
  }
  openObjectives(): void { this.dock.toggle('objectives'); }
  get currentPanel(): DockView | null {
    if (this.latestWorld?.colony.buildOpen) return 'colony';
    return this.dock.root.hidden ? null : this.dock.current;
  }
  get trackedObjective() { return this.objectives.trackedId; }
  get fullScreenWindow(): boolean { return this.dock.fullScreen; }
  /** Status notices and target guidance, shown under the objective card. */
  get noticeElements(): HTMLElement[] { return [this.root.querySelector<HTMLElement>('.notices')!, this.nearby.host, this.nav.guidance]; }
  setWindowPaused(paused: boolean): void { this.dock.setWindowPaused(paused); }
  /** Clicking a building in the world: Base → Buildings with it selected (legacy inspector with all features). */
  selectFacility(body: import('../sim/celestial').BodyId,id:number):void {
    if (featureVisible('catalogue')) {
      this.baseSection='legacy';
      this.dock.inspectFacility(`#${id} · ${body==='home'?'Selene':'Nacre'}`);
      this.command.selectFacility(body,id);
      return;
    }
    this.baseSection='buildings';
    this.baseSelected=id;
    this.dock.open('command');
  }
  openBuild():void{this.dock.open('colony');}
  get dockOpen():boolean{return !this.dock.root.hidden;}
  closeDock(): void { this.dock.close(); }
  constructor(onColonyAction: (action: ColonyAction) => void, private preferences: PresentationPreferences) {
    this.onAction=onColonyAction;
    this.buildBar=new BuildBar({
      select: kind => onColonyAction({ type: 'select', kind }),
      group: group => { this.buildGroup = group; if (this.latestWorld) this.renderBuild(this.latestWorld); },
      cancel: id => onColonyAction({ type: 'queueControl', id, operation: 'cancel' }),
      close: () => onColonyAction({ type: 'buildMode', open: false }),
    });
    this.dock.colony.addEventListener('change',e=>{const el=e.target as HTMLSelectElement;if(el.id==='build-site'&&this.latestWorld){const w=this.latestWorld,p=colonyPlanet(w),angle=Number(el.value)/p.radius;const valid=Number.isFinite(angle)&&Math.abs(angle)<=Math.PI,error=valid?orderError(w,w.colony.selected,angle):'Site must be finite and within this world’s surface range';this.pointerDraft={kind:w.colony.selected,angle:valid?angle:0,body:p.id,error,valid:!error,inputError:valid?null:error};this.update(w,this.root.dataset.state==='paused');}
});
    this.dock.cargo.addEventListener('change',e=>{const input=e.target as HTMLInputElement;if(input.id==='fuel-plan-amount'){this.fuelPlanAmount=input.value===''?NaN:Number(input.value);}});
    this.dock.objectives.append(this.objectives.content);
    this.nav = new NavigationPanel(onColonyAction); this.dock.navigation.append(this.nav.root);
    this.command = new CommandConsole(onColonyAction,this.preferences);
    const body = () => this.latestWorld?.siteBody ?? 'home';
    this.base = new BaseWindow({
      section: section => { this.baseSection = section; this.renderBase(); },
      select: id => { this.baseSelected = id; this.renderBase(); },
      toggle: id => onColonyAction({ type: 'remote', id, operation: 'toggle', body: body() }),
      recipe: id => onColonyAction({ type: 'remote', id, operation: 'recipe', body: body() }),
    });
    this.dock.command.append(this.base.host);
    this.nearby = new NearbyCard({
      toggle: () => onColonyAction({ type: 'toggleMachine' }),
      recipe: () => onColonyAction({ type: 'cycleRecipe' }),
      repair: () => onColonyAction({ type: 'repairBuilding' }),
      details: id => this.selectFacility(this.latestWorld?.siteBody ?? 'home', id),
    });
    this.root.id = 'hud';
    this.root.innerHTML = `<section class="instruments" aria-label="Flight telemetry"></section>
      <section class="notices"><div class="status" role="status" aria-live="polite"></div><div id="flight-alert" role="status" aria-live="polite" hidden></div><div id="threat-alert"></div><div id="crew-order-status" hidden><span></span><button type="button">Stop crew order</button></div></section>
      <div id="combat-status"></div>
      <footer><p class="context-hint"></p></footer>`;
    this.root.prepend(this.labels.root);this.root.append(this.buildBar.host, this.buildBar.tipHost, this.dock.root, this.nav.guidance); document.body.append(this.root);
    const crewStatus=this.root.querySelector<HTMLElement>('#crew-order-status')!;isolateControlKeys(crewStatus);crewStatus.querySelector('button')!.addEventListener('click',()=>{onColonyAction({type:'crewOrder',operation:'stop'});(document.activeElement as HTMLElement)?.blur();});
    this.instruments=new InstrumentPanel(this.root.querySelector('.instruments')!,()=>onColonyAction({type:'autopilot',operation:'cancel'}));
    this.status = this.root.querySelector('.status')!;
    this.mining = this.dock.cargo; this.colony = this.dock.colony;
    this.dock.root.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!button || button.disabled) return;
      if(button.dataset.fullCommand){this.dock.open('command');if(event.detail>0)button.blur();return;}
      if(button.dataset.autopilot&&['land','home','navigate','cancel'].includes(button.dataset.autopilot)){onColonyAction({type:'autopilot',operation:button.dataset.autopilot as 'land'|'home'|'navigate'|'cancel'});if(event.detail>0)button.blur();return;}
      if(button.dataset.fitComputer&&UPGRADE_IDS.includes(button.dataset.fitComputer as UpgradeId)){this.baseSection='legacy';this.dock.open('command');this.command.inspectPart(button.dataset.fitComputer as UpgradeId);return;}
      if(['command','colony'].includes(button.dataset.readinessView??'')){const view=button.dataset.readinessView as 'command'|'colony';if(view==='colony'){this.dock.close();onColonyAction({type:'buildMode',open:true});return;}this.baseSection='legacy';this.command.showLocal();this.dock.open(view);if(event.detail===0)this.dock.root.querySelector<HTMLButtonElement>('.dock-heading button')?.focus();else button.blur();return;}
      const action = actionFromButton(button);
      if (action) {
        if (event.detail > 0 || action.type === 'controlTurret') button.blur();
        onColonyAction(action);
      }
    });
  }
  update(world: WorldState, paused: boolean, threats: ThreatPrediction[] = []): void {
    const autoActive=world.autopilot.program!==null;if(autoActive&&!this.autopilotWasActive&&this.dock.root.dataset.panel==='autopilot')this.dock.close();this.autopilotWasActive=autoActive;this.root.dataset.autopilot=world.autopilot.program?.phase??'off';
    this.latestWorld=world;if(this.pointerDraft){if(this.pointerDraft.body!==colonyPlanet(world).id)this.clearBuildPointer();else{const error=this.pointerDraft.inputError??orderError(world,world.colony.selected,this.pointerDraft.angle);this.pointerDraft={...this.pointerDraft,kind:world.colony.selected,error,valid:!error};}}this.renderBuild(world);this.renderNearby(world,paused);
    this.root.dataset.crewOrder=world.crewOrder?.type??'none';const crewBar=this.root.querySelector<HTMLElement>('#crew-order-status')!;crewBar.hidden=!world.crewOrder;crewBar.querySelector('span')!.textContent=world.crewOrder?`Astronaut ${world.crewOrder.type==='walk'?'walking':'building'} · `:'';crewBar.querySelector('button')!.disabled=paused;
    const context = hudContext(world); this.dock.update(context, world.playerMode);
    this.root.dataset.context = context.key; this.root.dataset.body = colonyPlanet(world).id;
    this.root.dataset.time = world.system.time.toFixed(4); this.root.dataset.x = world.ship.position.x.toFixed(4); this.root.dataset.y = world.ship.position.y.toFixed(4);
    this.root.dataset.vx = world.ship.velocity.x.toFixed(4); this.root.dataset.vy = world.ship.velocity.y.toFixed(4); this.root.dataset.angle = world.ship.angle.toFixed(5); this.root.dataset.spin = world.ship.angularVelocity.toFixed(5);
    const compactHint=context.key==='flight'?(world.ship.state==='landed'?'W launch · F deploy · I ship · P pause':'W thrust · A/D steer · Space mine · I ship · P pause'):context.key==='surface'?'A/D walk · E interact · F board · B build':context.hint;
    setText(this.root.querySelector('.context-hint')!,controlHint(compactHint + (world.ship.towRig && world.playerMode === 'ship' ? ' · Y: latch / release tow' : ''),this.preferences));
    this.objectives.update(world,this.preferences);this.root.dataset.objectives=world.objectives.completed.join(',');
    const ship: Ship = world.ship;
    const onFoot = world.playerMode === 'astronaut';
    const t = onFoot ? telemetry({ ...world.astronaut, angle: localAngleAt(world, world.astronaut.position) }, SUIT.radius, world.system) : telemetry(ship, WORLD.shipRadius, world.system);
    const region = flightRegion(onFoot ? world.astronaut.position : ship.position, world.system);
    this.instruments.update(world);
    const safety = flightSafety(ship, world.system), flightAlert = this.root.querySelector<HTMLElement>('#flight-alert')!;
    const flightMessage = onFoot || ship.state === 'crashed' ? '' : safety.message;
    if (flightAlert.textContent !== flightMessage) flightAlert.textContent = flightMessage;
    flightAlert.hidden = !flightMessage; flightAlert.dataset.level = safety.level;
    this.root.dataset.approach = String(!onFoot && safety.approach);
    this.root.dataset.warningPaused = String(paused || ship.state === 'crashed');
    const noticeText=world.notice.message.replace(/ · P TO RESUME$/,'');
    const message = paused ? `PAUSED · ${world.notice.time > 0 ? `${noticeText} · ` : ''}P TO RESUME` : onFoot && world.astronaut.health <= 0 ? 'SUIT LOST · L CHECKPOINT · R NEW RUNTIME' :
      !onFoot && ship.state === 'crashed' ? 'HULL LOST · BACKSPACE RECOVERS WITH SUPPLIES · L LOADS · R RESETS' : world.notice.time > 0 ? noticeText :
      world.defence.controlled !== null ? 'TURRET CONTROL · A/D AIM · SPACE FIRE · E RELEASE' :
      onFoot ? (!habitatSource(world) && world.astronaut.oxygen < 30 ? 'LOW OXYGEN · RETURN TO SHIP OR SERVICE' : habitatNotice(world)) :
      ship.impact > 0 ? 'IMPACT · HULL DAMAGE' : ship.state === 'landed' ?
      (ship.landings > 0 ? 'TOUCHDOWN CONFIRMED · W TO RELAUNCH' : 'PAD SECURED · HOLD W TO LAUNCH') :
      ship.fuel <= 0 ? 'FUEL EMPTY · COASTING' : region === 'airless' ? 'AIRLESS FLIGHT · GRAVITY · NO AIR DRAG' : region === 'space' ? 'OPEN SPACE · SHARED GRAVITY' : 'ATMOSPHERIC FLIGHT · GRAVITY + DRAG';
    const originalNotice=world.notice.time>0?noticeText:null;
    const shown=originalNotice?message.split(originalNotice).map(part=>controlHint(part,this.preferences)).join(originalNotice):controlHint(message,this.preferences);
    setText(this.status,shown);
    this.status.dataset.routine=String(!paused&&world.notice.time<=0&&ship.state!=='crashed'&&ship.impact<=0&&world.defence.controlled===null&&(!onFoot||world.astronaut.health>0&&(world.astronaut.oxygen>=30||!!habitatSource(world))));
    this.status.classList.toggle('danger', onFoot ? world.astronaut.health <= 0 || !habitatSource(world) && world.astronaut.oxygen < 30 : ship.state === 'crashed' || ship.impact > 0);
    this.root.dataset.state = paused ? 'paused' : ship.state;
    this.root.dataset.altitude = t.altitude.toFixed(1);
    this.root.dataset.fuel = ship.fuel.toFixed(2);
    this.root.dataset.tilt = (t.tilt * 180 / Math.PI).toFixed(1);
    this.root.dataset.mode = world.playerMode;
    this.root.dataset.grounded = String(world.astronaut.grounded);
    this.root.dataset.oxygen = world.astronaut.oxygen.toFixed(2);
    this.root.dataset.suitHealth = world.astronaut.health.toFixed(1);
    this.root.dataset.surfaceAngle = localAngleAt(world, world.astronaut.position).toFixed(4);
    this.root.dataset.depotOpen = String(world.depotOpen);
    const incoming = threats.filter(t => t.impact).sort((a, b) => a.seconds - b.seconds)[0];
    const alert = this.root.querySelector('#threat-alert')!;
    const warning = world.defence.meteors.length ? `⚠ ${world.defence.meteors.length} INCOMING${incoming ? ` · IMPACT ${incoming.seconds.toFixed(0)} s` : ''}` : '';
    const combatStatus = this.root.querySelector<HTMLElement>('#combat-status')!, arm = ship.armament;
    const combatText = world.playerMode === 'ship' ? `${arm.selected.toUpperCase()} ${arm[arm.selected]} · CELL ${arm.energy.toFixed(0)} · HEAT ${arm.heat.toFixed(0)}${arm.overheated ? ' · COOLING LOCK' : ''}` : '';
    combatStatus.hidden=onFoot||!(world.combat.enemies.length||arm.heat>0||arm.overheated||arm.selected==='missile');
    if (combatStatus.textContent !== combatText) combatStatus.textContent = combatText;
    const hostiles = world.combat.enemies.length ? `${warning ? ' · ' : ''}${world.combat.enemies.length} HOSTILE${world.combat.enemies.every(d => d.state === 'retreat') ? ' · DISENGAGING' : world.combat.enemies.some(d => d.windup > 0) ? ' · DRONE AIMING' : ' · APPROACHING'}` : '';
    const emitters = world.colony.buildings.filter(b => isShield(b.kind)), active = emitters.filter(shieldActive).length;
    const protection = emitters.length && (warning || hostiles || emitters.some(b => b.status === 'shield breached')) ? `${warning || hostiles ? ' · ' : ''}SHIELDS ${active}/${emitters.length} ACTIVE${emitters.some(b => b.status === 'shield breached') ? ' · BREACHED' : ''}` : '';
    if (alert.textContent !== warning + hostiles + protection) alert.textContent = warning + hostiles + protection;
    this.root.dataset.cargo=cargoMass(world.ship).toFixed(2);this.root.dataset.depot=inventoryMass(world.depot).toFixed(2);
    this.root.dataset.asteroids=String(world.asteroids.length);this.root.dataset.pickups=String(world.pickups.length);this.root.dataset.mining=world.beam?'active':'idle';
    this.updateMining(world);
    this.nav.update(world, paused, !this.dock.navigation.hidden);
    if(!this.dock.autopilot.hidden)patchMarkup(this.dock.autopilot,autopilotPanel(world,paused));
    if (!this.dock.command.hidden) this.renderBase(paused);
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
    const cargo = cargoMass(world.ship), stored = inventoryMass(world.depot);
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
      ${world.playerMode === 'astronaut' ? surfacePanel(world) : `<p class="objective">${controlHint(objective,this.preferences)}</p><div class="target"><label>NEAREST DEPOSIT</label>${nearest && delta ? `${RESOURCE_INFO[nearest.resource].label} · ${Math.hypot(delta.x, delta.y).toFixed(0)} m<br><small>${Math.abs(bearing).toFixed(0)}° ${bearing < 0 ? 'left' : 'right'} of nose · laser ${miningStats(world.ship).range} m</small>` : 'Field depleted'}</div>
      <small>${cargo >= cargoCapacity(world.ship) ? 'HOLD FULL · return and unload' : world.tractorActive ? `TRACTOR ACTIVE · ${tractorStats(world.ship).range} m` : 'C: tractor · SPACE: laser'}</small>`}${readinessPanel(world,this.root.dataset.state==='paused',this.fuelPlanAmount)}${towingPanel(world, this.root.dataset.state === 'paused')}${freightPanel(world, this.root.dataset.state === 'paused')}`);
    this.root.dataset.cargo = cargo.toFixed(2); this.root.dataset.depot = stored.toFixed(2);
    this.root.dataset.asteroids = String(world.asteroids.length); this.root.dataset.pickups = String(world.pickups.length);
    this.root.dataset.mining = world.beam ? 'active' : 'idle';
  }
}
