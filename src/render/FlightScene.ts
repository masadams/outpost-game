import { keyLabel, type BindingSlot } from '../preferences/presentation';
import { blueprintRevealed } from '../sim/unlocks';
import { actionAllowed, featureVisible, filterActions } from '../preferences/features';
import {applyAutopilotAction} from '../sim/autopilot';
import { GameMenu, type MenuAction } from '../ui/GameMenu';
import { screenToWorld } from './pointer';
import { drawCrewOrder } from './crewOrders';
import { VisualEffects } from './effects';
import { decorateShortcuts } from '../ui/shortcuts';
import { RenderBudget, visible } from './budget';
import { drawShip } from './ship';
import { controlHint, readPresentation, applyPresentation } from '../preferences/presentation';
import { Settings } from '../ui/Settings';
import { sitePosition, activeWorld, allColonies } from '../sim/localWorld';
import { bodyExists, nearestPlanet, onGroundNow, planetAt, planets, relative, surfaceAngle } from '../sim/celestial';
import { localAngle } from '../sim/math';
import { flightSafety } from '../sim/flightSafety';
import { drawShields } from './shields';
import { applyExplorationAction } from '../sim/exploration';
import { drawExploration } from './exploration';
import { drawGeology } from './geology';
import { drawTowing } from './towing';
import { drawCombat } from './combat';
import { predictMeteor, type ThreatPrediction } from '../sim/meteor';
import { drawDefence } from './defence';
import Phaser from 'phaser';
import { Keyboard } from '../input/keyboard';
import { FixedClock } from '../sim/clock';
import { WORLD } from '../sim/config';
import { createWorld, stepWorld } from '../sim/world';
import { Hud } from '../ui/hud';
import { FlightCamera, FOCUS_Y } from './camera';
import { drawMining } from './mining';
import { drawSurface } from './surface';
import { drawColony } from './colony';
import { applyColonyAction, type ColonyAction } from '../sim/colony';
import { notify } from '../sim/messages';
import { inspectCheckpoint, writeCheckpoint } from '../persistence/checkpoint';
import { GameAudio } from '../audio/GameAudio';
import { Help } from '../ui/Help';
import { tractorStats } from '../sim/shipStats';
import { FlightChrome, type ViewAction } from '../ui/flight/HudChrome';
import { objectiveCard, regionView } from '../ui/flight/chromeView';
import { PickupFeed } from '../ui/flight/pickupFeed';
import { stormView } from '../ui/flight/stormView';
import { dayView } from '../ui/flight/dayView';
import { wreckCard, wreckMarks } from '../ui/flight/wreckView';
import { daylightAt } from '../sim/sun';
import { buildSky, drawSky } from './skyBackdrop';
import { lightAt, lightAtPoint } from '../sim/star';
import { mixColor, skyLook } from './lighting';
import { newWorld } from '../preferences/sun';
import { drawStormSamples, drawCrystal, drawCore } from './storm';
import { drawGround } from './ground';
import { stormKnowledge } from '../sim/stormKnowledge';
import { farPosition } from '../sim/storm';
import { drawStreak } from './ambient';
import { coach } from '../ui/flight/coach';
import { guideTarget } from '../ui/flight/guide';
import { drawCoachPointer } from './coachPointer';
import { FlightTools } from '../ui/FlightTools';
import { predictCoast, type Trajectory } from '../sim/trajectory';
import { createAtmosphere } from './atmosphere';
import { createPlanet } from './planet';
import { drawTrajectory } from './trajectory';

const PAD_LAMPS = { safe: 0x73f3cf, caution: 0xffb06a, critical: 0xff6b5a, neutral: 0x73f3cf } as const;

export class FlightScene extends Phaser.Scene {
  private effects=new VisualEffects();
  private budget=new RenderBudget();
  private lastDrawKey="";
  private starKey="";
  private pointerInside=false;
  private preferences = readPresentation();
  private settings!: Settings;
  private pausedBeforeSettings=false;
  private simulation = newWorld();
  private get ship() { return this.simulation.ship; }
  private clock = new FixedClock();
  private follow = new FlightCamera();
  private keys!: Keyboard;
  private hud!: Hud;
  private world!: Phaser.GameObjects.Container;
  private art!: Phaser.GameObjects.Graphics;
  private atmosphere!: Phaser.GameObjects.Image;
  private moon!: Phaser.GameObjects.Image;
  private cinder!: Phaser.GameObjects.Image;
  private ember!: Phaser.GameObjects.Image;
  private planet!: Phaser.GameObjects.Image;
  private stars!: Phaser.GameObjects.Graphics;
  private map!: Phaser.GameObjects.Graphics;
  private paused = false;
  private windowPaused = false;
  private menu!:GameMenu;
  private hasRun=false;
  private hudTime = 0;
  private colonyActions: ColonyAction[] = [];
  private audio!: GameAudio;
  private chrome!: FlightChrome;
  private pickupFeed = new PickupFeed();
  private sky!: Phaser.GameObjects.Graphics;
  private starVisibility = 1;
  private soundEnabling = false;
  private help!: Help;
  private pausedBeforeHelp = false;
  private flightTools!: FlightTools;
  private prediction: Trajectory | null = null;
  private predictionTime = 0;
  private threats: ThreatPrediction[] = [];
  private threatTime = 0;
  private starPoints = Array.from({ length: 240 }, (_, i) => ({ x: ((i * 0.61803398875) % 1), y: ((i * i * 0.41421356237) % 1), bright: i % 7 === 0 }));
  constructor() { super('flight'); }
  create(): void {
    applyPresentation(this.preferences);
    this.keys = new Keyboard(this, this.preferences.bindings); this.hud = new Hud(action => { if (!actionAllowed(action, undefined, this.simulation.exploration.known) || !this.revealed(action)) return; if(action.type==='autopilot'&&action.operation==='cancel')applyAutopilotAction(this.simulation,action);else if (action.type === 'navigate') applyExplorationAction(this.simulation, action); else if(['toggleBuild','buildMode','select','shift'].includes(action.type))applyColonyAction(activeWorld(this.simulation),action);else if (!this.halted) this.colonyActions.push(action); }, this.preferences);
    this.audio = new GameAudio();
    this.help = new Help(open => {
      if (open) this.pausedBeforeHelp = this.paused;
      this.setPaused(open ? true : this.pausedBeforeHelp);
    });
    this.settings = new Settings(this.preferences, () => { this.keys.setBindings(this.preferences.bindings); this.applySettings(); }, open => {
      if(open) this.pausedBeforeSettings=this.paused;
      this.setPaused(open ? true : this.pausedBeforeSettings);
    });
    this.applySettings();
    this.settings.attachVolume(() => this.audio.preferences.volume, volume => this.audio.setVolume(volume));
    this.chrome = new FlightChrome({
      objective: () => this.hud.openObjectives(),
      panel: panel => this.hud.chooseScreen(panel),
      menu: () => { this.setPaused(true); this.menu.open('pause'); },
      soundPress: () => { this.soundEnabling = this.audio.status === 'locked'; },
      sound: () => {
        if (this.soundEnabling || this.audio.status === 'locked') this.audio.enable(); else this.audio.toggleMute();
        this.soundEnabling = false;
      },
      help: () => this.help.toggle(),
      settings: () => this.settings.toggle(),
      pause: () => this.setPaused(!this.paused),
      view: action => this.viewAction(action),
    });
    document.querySelector('#hud')!.append(this.chrome.host);
    this.flightTools = new FlightTools();
    this.loadCheckpoint(false);
    this.audio.reset(this.simulation);this.effects.reset(this.simulation);this.pickupFeed.reset(this.simulation);
    this.follow.viewportHeight = this.scale.height;
    this.follow.reset(this.simulation.playerMode === 'astronaut' ? this.simulation.astronaut : this.ship, this.simulation.system);
    this.stars = this.add.graphics();
    this.sky = this.add.graphics();
    this.world = this.add.container(0, 0); this.atmosphere = createAtmosphere(this);
    this.planet = createPlanet(this);
    this.moon = createPlanet(this, 'moon');
    this.cinder = createPlanet(this, 'cinder').setTint(0xcdb3a2);
    this.ember = createPlanet(this, 'ember').setTint(0xe0a487);
    this.art = this.add.graphics(); this.world.add([this.atmosphere, this.planet, this.moon, this.cinder, this.ember, this.art]);
    this.map = this.add.graphics();
    this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{
      if(this.menu?.isOpen||this.help.isOpen||this.settings.isOpen||pointer.event.target!==this.game.canvas)return;
      const at=screenToWorld(pointer,{...this.follow,width:this.scale.width,height:this.scale.height});
      const local=activeWorld(this.simulation);this.hud.setBuildPointer(local,at,this.follow.zoom);
      if(pointer.rightButtonDown()){
        // Right-clicking a building opens its menu, like any other game with buildings.
        if(!this.hud.pointerBuilding){
          const near=allColonies(this.simulation).flatMap(site=>site.colony.buildings.map(b=>({id:b.id,body:site.siteBody??'home',p:sitePosition(site,b.angle,8)}))).map(v=>({...v,d:Math.hypot(at.x-v.p.x,at.y-v.p.y)})).sort((a,b)=>a.d-b.d)[0];
          if(near&&near.d<Math.max(16,10/this.follow.zoom)){this.hud.openContextMenu(near.body,near.id,(pointer.event as MouseEvent).clientX,(pointer.event as MouseEvent).clientY);return;}
        }
        this.hud.closeContextMenu();
        this.hud.clearBuildPointer();
        if(this.hud.pointerBuilding){applyColonyAction(local,{type:'buildMode',open:false});return;}
        if(!this.halted){if(this.simulation.playerMode==='astronaut'){const p=planetAt(local.siteBody??'home',this.simulation.system);if(Math.abs(Math.hypot(at.x-p.position.x,at.y-p.position.y)-p.radius)<Math.max(60,30/this.follow.zoom))this.colonyActions.push({type:'crewOrder',operation:'walk',angle:surfaceAngle(p,at),body:p.id});}}
        return;
      }
      if(this.hud.pointerBuilding){
        const d=this.hud.buildPointer;
        if(!this.halted&&d){
          if(d.valid){
            this.colonyActions.push({type:'queueBuild',kind:d.kind,angle:d.angle,body:d.body});
            // On foot, the astronaut walks over and builds it straight away.
            if(this.simulation.playerMode==='astronaut'&&!this.simulation.crewOrder)this.colonyActions.push({type:'crewOrder',operation:'build',body:d.body});
          }else notify(this.simulation,d.error??'Invalid site');
        }
        return;
      }
      const candidates=allColonies(this.simulation).flatMap(site=>site.colony.buildings.map(b=>({id:b.id,body:site.siteBody??'home',p:sitePosition(site,b.angle,8)}))).map(v=>({...v,d:Math.hypot(at.x-v.p.x,at.y-v.p.y)})).sort((a,b)=>a.d-b.d);
      if(candidates[0]?.d<Math.max(16,10/this.follow.zoom))this.hud.selectFacility(candidates[0].body,candidates[0].id);
    });
    const enter=()=>{this.pointerInside=true;},leave=()=>{this.pointerInside=false;this.hud.hideBuildTip();},contextMenu=(e:Event)=>e.preventDefault();
    this.game.canvas.addEventListener('pointerenter',enter);this.game.canvas.addEventListener('pointerleave',leave);this.game.canvas.addEventListener('contextmenu',contextMenu);
    const blur = () => this.setPaused(true), visibility = () => { if (document.hidden) this.setPaused(true); };
    window.addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility);
    const wheel = (event: WheelEvent) => {
      if (this.menu?.isOpen || this.help.isOpen || this.settings.isOpen) return;
      this.follow.zoomBy(Math.exp(-Math.max(-300, Math.min(300, event.deltaY)) * 0.002)); event.preventDefault();
    };
    this.game.canvas.addEventListener('wheel', wheel, { passive: false });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility);
      this.game.canvas.removeEventListener('pointerenter',enter);this.game.canvas.removeEventListener('pointerleave',leave);this.game.canvas.removeEventListener('contextmenu',contextMenu);
      this.menu.destroy();this.settings.destroy(); this.audio.destroy(); this.chrome.destroy(); this.help.destroy(); this.keys.destroy(); this.hud.destroy();
      this.flightTools.destroy(); this.game.canvas.removeEventListener('wheel', wheel);
    });
    this.menu=new GameMenu(action=>this.menuAction(action),()=>{try{const save=inspectCheckpoint(localStorage);return {hasSave:!!save.world,saveStatus:save.source==='previous'?'Previous checkpoint available · latest checkpoint missing or invalid · Continue loads the older flight paused':save.world?'Checkpoint available · Continue loads paused':'No checkpoint yet · start a new game',hasRun:this.hasRun,seed:this.simulation.seed};}catch{return {hasSave:false,saveStatus:'Checkpoint unavailable or incompatible · New Game is available',hasRun:this.hasRun};}},()=>controlHint('P resumes',this.preferences));
    this.setPaused(true);this.menu.open('title');
  }
  private newGame():void{
    const invalid=!this.hasRun&&this.simulation.notice.message.includes('CHECKPOINT INVALID');this.simulation=newWorld();if(invalid)notify(this.simulation,'CHECKPOINT INVALID · NEW RUNTIME STARTED · OLD SAVE KEPT');this.hasRun=true;this.menu.close();this.hud.closeDock();this.hud.clearBuildPointer();this.setPaused(false);this.follow.reset(this.ship,this.simulation.system);this.audio.reset(this.simulation);this.effects.reset(this.simulation);this.pickupFeed.reset(this.simulation);this.prediction=null;this.threats=[];
  }
  private menuAction(action:MenuAction):void{
    if(action==='new'){this.newGame();return;}
    if(action==='resume'){if(this.hasRun){this.menu.close();this.setPaused(false);}return;}
    if(action==='continue'){if(this.loadCheckpoint(true)){this.hasRun=true;this.menu.close();this.setPaused(true);}else this.menu.message('Cannot load this checkpoint · current runtime kept');return;}
    if(action==='save'){if(this.hasRun){try{writeCheckpoint(localStorage,this.simulation);this.menu.message('Checkpoint saved');}catch{this.menu.message('Save failed · storage unavailable or state invalid');}}return;}
    if(action==='title'){this.menu.open('title');return;}
    if(action==='settings')this.settings.toggle();
    if(action==='controls')this.help.toggle();
  }
  private applySettings(): void {
    this.follow.reducedMotion=this.preferences.reducedMotion;this.follow.rotate=this.preferences.cameraRotation;
    this.audio.setMix(this.preferences.effectsVolume,this.preferences.musicVolume);
  }
  private viewAction(action: ViewAction): void {
    if (this.menu?.isOpen || this.help.isOpen || this.settings.isOpen) return;
    if (action === 'trajectory') { this.flightTools.trajectory = !this.flightTools.trajectory; this.prediction = null; this.threats = []; }
    else if (action === 'autoZoom') this.follow.autoZoom();
    else this.follow.zoomBy(action === 'zoomIn' ? 1.25 : 0.8);
  }
  /** The rock under the laser and the ore the tractor is pulling in: what the pilot is working on. */
  private workPoints(): Array<{ x: number; y: number }> {
    const world = this.simulation;
    if (world.playerMode !== 'ship' || world.ship.state !== 'flying') return [];
    const points: Array<{ x: number; y: number }> = [];
    if (world.beam && world.beam.targetId !== null) points.push(world.beam.end);
    if (world.tractorActive) {
      const range = tractorStats(world.ship).range;
      const near = world.pickups
        .map(p => ({ p, d: Math.hypot(p.position.x - world.ship.position.x, p.position.y - world.ship.position.y) }))
        .filter(v => v.d <= range)
        .sort((a, b) => a.d - b.d)
        .slice(0, 3);
      for (const v of near) points.push(v.p.position);
    }
    return points;
  }
  private coachKeys() {
    const key = (slot: BindingSlot) => keyLabel(this.preferences.bindings[slot] ?? slot);
    return { thrust: key('W'), turn: `${key('A')} / ${key('D')}`, fire: key('SPACE'), tractor: key('C'), unload: key('E') };
  }
  private updateChrome(): void {
    const world = activeWorld(this.simulation);
    const key = (slot: BindingSlot) => keyLabel(this.preferences.bindings[slot] ?? slot);
    this.chrome.update({
      objective: objectiveCard(world, this.hud.trackedObjective, this.coachKeys()),
      region: regionView(world),
      panel: this.hud.currentPanel,
      paused: this.paused,
      sound: {
        status: this.audio.status,
        muted: this.audio.preferences.muted,
        audible: this.audio.audible,
        loops: this.audio.loopCount,
      },
      camera: { mode: this.follow.mode, zoom: this.follow.zoom, x: this.follow.x, y: this.follow.y, angle: this.follow.angle },
      pickups: this.pickupFeed.lines(),
      storm: stormView(world),
      day: dayView(world),
      wreck: wreckCard(world),
      trajectory: this.flightTools.trajectory,
      predictionPoints: this.simulation.towing.targetId !== null ? 0 : this.prediction?.points.length ?? 0,
      keys: {
        ship: key('I'),
        build: key('B'),
        mute: key('M'),
        help: key('H'),
        pause: key('P'),
        path: key('J'),
        zoomIn: key('PLUS'),
        zoomOut: key('MINUS'),
        autoZoom: key('ZERO'),
      },
    });
    this.chrome.adoptNotices(this.hud.noticeElements);
  }
  private setPaused(value: boolean): void {
    this.paused = value; this.keys.release(); this.colonyActions = []; this.clock.reset();
    if (value) this.audio.silence();
  }
  private lastPlayerMode: 'ship' | 'astronaut' = 'ship';
  /** Seconds left to send the astronaut to work after stepping out; zero when nothing is waiting. */
  private dispatchWait = 0;
  /** Stepping out of the lander with building work queued sends the astronaut to do it, once they are standing. */
  private dispatchOnStepOut(delta: number): void {
    const mode = this.simulation.playerMode;
    if (this.lastPlayerMode === 'ship' && mode === 'astronaut') this.dispatchWait = 3;
    this.lastPlayerMode = mode;
    if (this.dispatchWait <= 0) return;
    this.dispatchWait -= Math.max(0, delta) / 1000;
    if (mode !== 'astronaut' || this.simulation.crewOrder) {
      this.dispatchWait = 0;
      return;
    }
    if (this.halted || !this.simulation.astronaut.grounded) return;
    this.dispatchWait = 0;
    const local = activeWorld(this.simulation);
    if (local.colony.command.queue.some(o => !o.paused)) this.colonyActions.push({ type: 'crewOrder', operation: 'build' });
  }
  /** The world is still while the player pauses, or while a full-screen window is open in flight. */
  private get halted(): boolean { return this.paused || this.windowPaused; }
  /** Base and Map pause the world only while the lander is flying (docs/DECISIONS.md, mockup 1 review). */
  private updateWindowPause(): void {
    const flying = this.simulation.playerMode === 'ship' && this.simulation.ship.state === 'flying';
    const next = this.hud.fullScreenWindow && flying;
    if (next === this.windowPaused) return;
    this.windowPaused = next;
    this.hud.setWindowPaused(next);
    this.keys.release(); this.colonyActions = []; this.clock.reset();
    if (next) this.audio.silence();
  }
  /** In the new-player set, blueprints that have not been earned cannot be picked, even by number key. */
  private revealed(action: { type: string; kind?: string }): boolean {
    if (featureVisible('catalogue')) return true;
    if (action.type !== 'select' && action.type !== 'queueBuild') return true;
    return blueprintRevealed(this.simulation, action.kind as never);
  }

  update(_time: number, delta: number): void {
    this.updateWindowPause();
    this.dispatchOnStepOut(delta);
    if (this.keys.mute()) this.audio.toggleMute();
    if (!this.settings.isOpen && (!this.menu.isOpen||this.help.isOpen) && this.keys.help()) this.help.toggle();
    if (this.keys.closePanel()) { if (this.settings.isOpen) this.settings.close(); else if (this.help.isOpen) this.help.close(); else if(!this.menu.isOpen){const local=activeWorld(this.simulation);if(local.colony.buildOpen){applyColonyAction(local,{type:'buildMode',open:false});this.hud.clearBuildPointer();}else if(this.hud.dockOpen)this.hud.closeDock();else{this.setPaused(true);this.menu.open('pause');}} }
    if (!this.menu.isOpen && !this.settings.isOpen && !this.help.isOpen && this.keys.save()) {
      try { writeCheckpoint(window.localStorage, this.simulation); notify(this.simulation, 'CHECKPOINT SAVED · K TO UPDATE · L TO LOAD'); }
      catch { notify(this.simulation, 'CHECKPOINT SAVE FAILED · STORAGE UNAVAILABLE OR STATE INVALID'); }
    }
    if (!this.menu.isOpen && !this.settings.isOpen && !this.help.isOpen && this.keys.load()) this.loadCheckpoint(true);
    if (!this.menu.isOpen && !this.settings.isOpen && !this.help.isOpen && this.keys.pause()) this.setPaused(!this.paused);
    if (!this.menu.isOpen && !this.settings.isOpen && !this.help.isOpen) {
      for(const a of this.keys.planningActions()){const local=activeWorld(this.simulation);applyColonyAction(local,a);if(a.type==='toggleBuild'&&local.colony.buildOpen)this.hud.openBuild();}
      if (this.keys.inventory()) this.hud.toggleDock('cargo');
      if (this.keys.trajectory()) this.viewAction('trajectory');
      if (this.keys.zoomIn()) this.viewAction('zoomIn');
      if (this.keys.zoomOut()) this.viewAction('zoomOut');
      if (this.keys.autoZoom()) this.viewAction('autoZoom');
    }
    if (!this.halted) {
      this.clock.advance(delta / 1000, dt => {
        const input = this.keys.read();
        const actions = filterActions([...(input.colonyActions ?? []), ...this.colonyActions.splice(0)], undefined, this.simulation.exploration.known).filter(a => this.revealed(a));
        const combatFire = !!input.combatFire && featureVisible('combat');
        stepWorld(this.simulation, { ...input, combatFire, colonyActions: actions }, dt);
      });
    }
    const onFoot = this.simulation.playerMode === 'astronaut';
    this.follow.viewportHeight = this.scale.height;
    this.follow.viewportWidth = this.scale.width;
    this.follow.work = this.workPoints();
    this.follow.update(onFoot ? this.simulation.astronaut : this.ship, Math.min(delta / 1000, 0.1), onFoot, this.simulation.system);
    this.hud.updateBuildingLabels(this.simulation,{...this.follow,width:this.scale.width,height:this.scale.height});
    if(this.pointerInside){this.hud.setBuildPointer(activeWorld(this.simulation),screenToWorld(this.input.activePointer,{...this.follow,width:this.scale.width,height:this.scale.height}),this.follow.zoom);this.hud.showBuildTip(this.input.activePointer.x,this.input.activePointer.y);}
    this.predictionTime += delta / 1000;
    if (this.simulation.towing.targetId !== null) this.prediction = null;
    if (this.simulation.towing.targetId === null && this.flightTools.trajectory && (this.prediction === null || (!this.halted && this.predictionTime >= 0.4))) {
      this.prediction = predictCoast(this.ship, 180, this.simulation.system); this.predictionTime = 0;
    }
    this.updateThreats(delta / 1000);
    this.flightTools.update(this.ship, this.prediction, this.simulation.towing.targetId !== null, this.simulation.system);
    this.audio.update(activeWorld(this.simulation), this.halted, delta / 1000);
    this.updateChrome();
    this.pickupFeed.update(this.simulation,this.halted?0:Math.min(delta/1000,.1));
    this.effects.update(this.simulation,Math.min(delta/1000,.1),this.halted,this.preferences.reducedMotion?0:this.preferences.quality==='low'?4:12,{centre:{x:this.follow.x,y:this.follow.y},radius:Math.hypot(this.scale.width,this.scale.height)/2/this.follow.zoom+128/this.follow.zoom});
    if (!this.preferences.reducedMotion) {
      for (const k of this.effects.takeKicks()) this.cameras.main.shake(Math.round(k.seconds * 1000), 0.0035 * k.strength);
    } else this.effects.takeKicks();
    const drawKey=[this.scale.width,this.scale.height,this.follow.x.toFixed(3),this.follow.y.toFixed(3),this.follow.angle.toFixed(4),this.follow.zoom.toFixed(4),this.preferences.quality,this.preferences.reducedMotion,this.flightTools.trajectory,this.hud.selectedBuildingId,JSON.stringify(this.hud.buildPreview),this.hud.shieldAccents,this.simulation.system.time,this.simulation.colony.buildOpen,this.simulation.outposts.moon.colony.buildOpen].join(':');
    if(!this.halted || drawKey!==this.lastDrawKey){const started=performance.now();this.draw();this.budget.record('draw',performance.now()-started);this.lastDrawKey=drawKey;}

    this.hudTime += delta;
    if (this.hudTime >= 100) {
      const started=performance.now();this.hud.update(activeWorld(this.simulation), this.halted, this.threats);decorateShortcuts(document.body,this.preferences);this.budget.record('hud',performance.now()-started);this.hudTime=0;
      const root=document.querySelector<HTMLElement>('#hud')!;
      root.dataset.renderMs=this.budget.report('draw').mean.toFixed(3);root.dataset.renderP95=this.budget.report('draw').p95.toFixed(3);root.dataset.hudMs=this.budget.report('hud').mean.toFixed(3);
      root.dataset.drawSamples=String(this.budget.report('draw').samples);root.dataset.starCount=this.preferences.quality==='low'?'80':'240';root.dataset.effectCap=this.preferences.reducedMotion?'0':this.preferences.quality==='low'?'8':'24';
    }
  }
  private loadCheckpoint(requested: boolean): boolean {
    try {
      const selection = inspectCheckpoint(window.localStorage), saved = selection.world;
      if (saved) {
        if(selection.source==='previous')notify(saved,'PREVIOUS CHECKPOINT LOADED · LATEST MISSING OR INVALID · P TO RESUME');
        this.simulation = saved; this.paused = true; this.keys.release(); this.clock.reset(); this.colonyActions = [];
        this.follow.reset(saved.playerMode === 'astronaut' ? saved.astronaut : saved.ship,saved.system);
        this.audio.reset(saved);this.effects.reset(saved);this.pickupFeed.reset(saved); this.audio.silence();
        this.prediction = null; this.threats = [];return true;
      } else if (requested) notify(this.simulation, 'NO CHECKPOINT · PRESS K TO SAVE');
    } catch { notify(this.simulation, 'CHECKPOINT INVALID OR STORAGE UNAVAILABLE · CURRENT WORLD KEPT'); }
    return false;
  }
  /** The sun in the sky: a warm disc and glow that circles the player, hidden once it is well below the horizon. */
  private drawSun(width: number, height: number, daylight: number): void {
    const sky = this.sky;
    sky.clear();
    if (!this.preferences.reducedMotion) drawStreak(sky, width, height, this.time.now / 1000, Math.max(0, Math.min(1, 1.4 - daylight * 1.4)) * this.starVisibility);
    const system = this.simulation.system;
    if (!system.sun) return;
    const eye = this.simulation.playerMode === 'astronaut' ? this.simulation.astronaut.position : this.simulation.ship.position;
    const planet = nearestPlanet(eye, system);
    const here = surfaceAngle(planet, eye);
    const light = lightAt(system, planet.id, here, Math.max(1, Math.hypot(eye.x - planet.position.x, eye.y - planet.position.y) - planet.radius));
    const height01 = light.elevation;
    if (height01 < -0.25) return;
    const shown = Math.max(0, Math.min(1, (height01 + 0.25) / 0.4)) * (1 - 0.9 * light.eclipse);
    const heading = Math.atan2(light.direction.x, -light.direction.y) - this.follow.angle;
    const reach = 0.4 * Math.min(width, height);
    const x = width / 2 + Math.sin(heading) * reach;
    const y = height * FOCUS_Y - Math.cos(heading) * reach;
    const warm = mixColor(0xffb36b, 0xfff2cf, Math.max(0, Math.min(1, height01 * 1.4)));
    for (const [radius, alpha] of [[90, 0.05], [54, 0.09], [30, 0.16]] as const) {
      sky.fillStyle(warm, alpha * shown);
      sky.fillCircle(x, y, radius);
    }
    sky.fillStyle(warm, 0.95 * shown);
    sky.fillCircle(x, y, 11);
    void daylight;
  }
  private threatCache = new Map<number, { prediction: ThreatPrediction; age: number }>();
  /**
   * Predictions for the incoming rocks are the costly part of a storm, so they are cheap and spread out: one rock per frame,
   * on a coarse step, each refreshed about once a second and a half. A rock with no prediction yet is done first.
   */
  private updateThreats(seconds: number): void {
    const rocks = this.simulation.defence.meteors.slice(0, 12);
    const ids = new Set(rocks.map(m => m.id));
    for (const id of this.threatCache.keys()) if (!ids.has(id)) this.threatCache.delete(id);
    if (!this.halted) for (const entry of this.threatCache.values()) entry.age += seconds;
    const due = rocks
      .map(m => ({ m, age: this.threatCache.get(m.id)?.age ?? Infinity }))
      .filter(v => v.age >= 1.5 && (!this.halted || v.age === Infinity))
      .sort((a, b) => b.age - a.age)[0];
    if (due) {
      const prediction = this.onGround(predictMeteor(due.m, 90, this.simulation.system, 0.1));
      this.threatCache.set(due.m.id, { prediction, age: 0 });
    }
    this.threats = rocks.map(m => this.threatCache.get(m.id)?.prediction).filter((p): p is ThreatPrediction => !!p);
  }
  /** Threat paths and impact markers drawn on the ground as it is now, so they point at the right place on a turning planet. */
  private onGround(p: ThreatPrediction): ThreatPrediction {
    const system = this.simulation.system;
    return {
      ...p,
      points: p.points.map((point, i) => onGroundNow('home', system, point, Math.min(i * 0.5, p.seconds))),
      impact: p.impact ? onGroundNow('home', system, p.impact, p.seconds) : null,
    };
  }
  private draw(): void {
    const { width, height } = this.scale;
    const g = this.art; g.clear(); this.map.clear();
    const starKey=`${width}/${height}/${this.preferences.quality}/${this.simulation.seed}`;
    if(starKey!==this.starKey){this.stars.clear();this.starKey=starKey;
    drawSky(this.stars,buildSky(this.simulation.seed,this.preferences.quality==='low'?'low':'high'),width,height);
    for (const star of this.starPoints.slice(0,this.preferences.quality==='low'?80:240)) {
      this.stars.fillStyle(star.bright ? 0xa9c9dc : 0x456079, star.bright ? 0.85 : 0.5);
      this.stars.fillRect(star.x * width, star.y * height, star.bright ? 2 : 1, star.bright ? 2 : 1);
    }
    }
    const view={centre:{x:this.follow.x,y:this.follow.y},radius:Math.hypot(width,height)/2/this.follow.zoom+128/this.follow.zoom};
    this.world.setPosition(width / 2, height * FOCUS_Y).setScale(this.follow.zoom).setRotation(-this.follow.angle);
    g.setPosition(-this.follow.x, -this.follow.y);
    // Light: the sky, the ground and the stars follow the sun where the player is.
    const eye = this.simulation.playerMode === 'astronaut' ? this.simulation.astronaut.position : this.simulation.ship.position;
    const eyePlanet = nearestPlanet(eye, this.simulation.system);
    const daylight = daylightAt(this.simulation.system, surfaceAngle(eyePlanet, eye), eyePlanet.id);
    const look = skyLook(daylight);
    this.cameras.main.setBackgroundColor(look.background);
    this.stars.setAlpha(look.stars);
    this.starVisibility = look.stars;
    this.drawSun(width, height, daylight);
    const home = planetAt('home', this.simulation.system), moon = planetAt('moon', this.simulation.system);
    this.atmosphere.setAlpha(look.atmosphere);
    this.planet.setTint(look.planetTint);
    this.art.setAlpha(look.world);
    this.atmosphere.setPosition(home.position.x - this.follow.x, home.position.y - this.follow.y);
    this.moon.setVisible(this.simulation.system.binary).setPosition(moon.position.x - this.follow.x, moon.position.y - this.follow.y);
    this.planet.setPosition(home.position.x - this.follow.x, home.position.y - this.follow.y);
    const cinder = planetAt('cinder', this.simulation.system);
    this.cinder.setVisible(this.simulation.system.binary).setPosition(cinder.position.x - this.follow.x, cinder.position.y - this.follow.y);
    const ember = planetAt('ember', this.simulation.system);
    const emberHere = bodyExists('ember', this.simulation.system) && this.simulation.system.binary;
    this.ember.setVisible(emberHere).setPosition(ember.position.x - this.follow.x, ember.position.y - this.follow.y);
    const padSafety = flightSafety(this.simulation.ship, this.simulation.system);
    const padLevel = padSafety.approach ? padSafety.level : 'neutral';
    const padBody = nearestPlanet(this.simulation.ship.position, this.simulation.system).id;
    for (const body of planets(this.simulation.system)) {
      g.lineStyle(.6,body.id==='home'?0xa9d2c7:0xd0c4dd,.7);g.strokeCircle(body.position.x,body.position.y,body.radius);
      g.save(); g.translateCanvas(body.position.x, body.position.y); g.rotateCanvas(body.spin);
    // Landing pad: a flat plate just under the surface, so the feet stand on its top edge.
    g.fillStyle(0x3fbfa8); g.fillRect(-30, -body.radius, 60, 1.8);
    g.lineStyle(0.5, 0xb7fff0); g.lineBetween(-30, -body.radius, 30, -body.radius);
    g.lineStyle(0.5, 0x17574e);
    for (const x of [-24, -12, 0, 12, 24]) g.lineBetween(x, -body.radius + 0.3, x, -body.radius + 1.6);
    // Beacon posts report the approach: green inside every touchdown limit, amber near one, red when about to hit.
    const lamp = body.id === padBody && padLevel !== 'neutral' ? PAD_LAMPS[padLevel] : 0x73f3cf;
    const pulse = padLevel === 'safe' && !this.preferences.reducedMotion ? 0.65 + 0.35 * Math.sin(this.time.now / 140) : 1;
    for (const x of [-32, 32]) {
      g.lineStyle(1, lamp); g.lineBetween(x, -body.radius, x, -body.radius - 18);
      g.fillStyle(lamp, pulse); g.fillCircle(x, -body.radius - 19, 2);
    }
    if (body.id === padBody && padLevel !== 'neutral') {
      g.fillStyle(lamp, 0.12 * pulse); g.fillRect(-30, -body.radius - 2.5, 60, 2.5);
    }
    // Pad beacon remains visible at orbital zoom.
    g.lineStyle(1 / this.follow.zoom, 0x73f3cf, 0.35); g.strokeCircle(0, -body.radius - WORLD.shipRadius, 16 / this.follow.zoom);
      g.restore();
    }
    if (this.flightTools.trajectory && this.simulation.towing.targetId === null) drawTrajectory(g, this.prediction, this.ship, this.follow.zoom);
    drawExploration(g, this.simulation, this.follow.zoom);
    drawMining(g, this.simulation, {
      zoom: this.follow.zoom,
      view,
      detail: this.preferences.quality === 'high',
      time: this.time.now / 1000,
      animate: !this.halted && !this.preferences.reducedMotion,
      light: this.simulation.system.sun ? lightAtPoint(this.simulation.system, this.simulation.ship.position, null).direction : undefined,
    });
    drawGround(g, this.simulation, view, this.follow.zoom);
    drawStormSamples(g, this.simulation, this.follow.zoom, this.time.now / 1000, view);
    drawCrystal(g, this.simulation, this.follow.zoom, this.time.now / 1000, view);
    drawCore(g, this.simulation, this.follow.zoom, this.time.now / 1000, view);
    for (const probe of this.simulation.exploration.probes) {
      g.fillStyle(0x9fe4ff, 0.25);
      g.fillCircle(probe.position.x, probe.position.y, Math.max(6, 10 / this.follow.zoom));
      g.fillStyle(0xdff6ff, 1);
      g.fillCircle(probe.position.x, probe.position.y, Math.max(2, 3 / this.follow.zoom));
    }
    drawTowing(g, this.simulation, this.follow.zoom);
    drawCrewOrder(g,this.simulation,this.follow.zoom);
    for (const site of allColonies(this.simulation)) {
      drawGeology(g, site, this.follow.zoom); drawShields(g, site, this.hud.shieldAccents && !this.preferences.reducedMotion);
      drawColony(g, site, this.hud.selectedBuildingId, (site.siteBody ?? 'home') === this.hud.buildPreview?.body ? this.hud.buildPreview : null, view, this.preferences.quality==='high', this.time.now/1000, !this.halted&&!this.preferences.reducedMotion);
      drawSurface(g, site, this.halted || this.preferences.reducedMotion ? 0 : this.simulation.system.time);
    }
    drawDefence(g, this.simulation, this.threats, this.follow.zoom, view);
    drawCombat(g, this.simulation, this.follow.zoom, this.preferences.reducedMotion, view, this.preferences.quality==='high');
    const s = this.ship;
    const coaching = coach(this.simulation, this.coachKeys());
    const guide = coaching ? null : guideTarget(this.simulation);
    const pointAt = coaching?.target ?? guide;
    if (pointAt) drawCoachPointer(g, s.position, pointAt, this.follow.zoom, this.time.now / 1000, !this.halted && !this.preferences.reducedMotion);
    this.effects.draw(g,this.follow.zoom);
    // Lost landers stay in the world; while the transponder lasts a red light blinks on them.
    for (const wreck of this.simulation.wrecks) {
      if (!visible(view, wreck.ship.position, 30)) continue;
      drawShip(g, wreck.ship, this.follow.zoom, this.time.now, true, true);
      if (wreck.beaconUntil > this.simulation.system.time && (this.preferences.reducedMotion || Math.floor(this.time.now / 600) % 2 === 0)) {
        g.fillStyle(0xff6b5a, 0.9); g.fillCircle(wreck.ship.position.x, wreck.ship.position.y, Math.max(1, 2.5 / this.follow.zoom));
      }
    }
    drawShip(g,s,this.follow.zoom,this.time.now,this.halted,this.preferences.reducedMotion);
    const mx = width - 92, my = height - 100, m = this.map;
    m.fillStyle(0x0a1724, .9); m.fillCircle(mx, my, 68); m.lineStyle(1, 0x233c4b); m.strokeCircle(mx, my, 62);
    const point = (p: { x: number; y: number }) => { const k = Math.min(.0058, 61 / Math.max(1, Math.hypot(p.x, p.y))); return { x: mx + p.x * k, y: my + p.y * k }; };
    for (const body of planets(this.simulation.system)) { const p = point(body.position); m.lineStyle(1, body.id === 'home' ? 0x73f3cf : 0xc9b2ef); m.strokeCircle(p.x, p.y, body.radius * .0058); }
    for (const actor of [...this.simulation.asteroids, ...this.simulation.exploration.sites]) { const p = point(actor.position); m.fillStyle(0x9bb4c5, .7); m.fillCircle(p.x, p.y, 1.3); }
    // The storm: amber. Far bodies show only once the Observatory has seen them, as rings that tighten with better tracking.
    for (const rock of this.simulation.defence.meteors) { const p = point(rock.position); m.fillStyle(0xffb06a, .95); m.fillCircle(p.x, p.y, 1.8); }
    for (const mark of wreckMarks(this.simulation)) { const p = point(mark.at); m.lineStyle(1, 0xff6b5a, .95); m.strokeRect(p.x - 2.5, p.y - 2.5, 5, 5); }
    const known = stormKnowledge(this.simulation);
    if (known) {
      const ring = known.level === 'sighted' ? 5 : known.level === 'tracked' ? 3 : 1.8;
      for (const body of this.simulation.storm.far) { const p = point(farPosition(body, this.simulation.system.time)); m.lineStyle(1, 0xffb06a, .9); m.strokeCircle(p.x, p.y, ring); }
    }
    const ship = point(s.position); m.fillStyle(0xffcf94); m.fillCircle(ship.x, ship.y, 3);
    if (this.simulation.playerMode === 'astronaut') { const p = point(this.simulation.astronaut.position); m.fillStyle(0xe0eff2); m.fillCircle(p.x, p.y, 2); }
  }
}
