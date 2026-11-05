import { featureVisible } from '../preferences/features';
import { isolateControlKeys } from './controlKeys';
import type { DockView, HudContext } from './context';

export class OperationsDock {
  private shipTabs=document.createElement('nav');
  readonly root = document.createElement('aside');
  readonly autopilot = document.createElement('section');
  private inspection=false;
  private inspectionTitle='Facility controls';
  readonly cargo = document.createElement('section');
  readonly objectives = document.createElement('section');
  readonly colony = document.createElement('section');
  readonly combat = document.createElement('section');
  readonly navigation = document.createElement('section');
  readonly command = document.createElement('section');
  readonly defence = document.createElement('section');
  private heading = document.createElement('span');
  private pausedBadge = document.createElement('span');
  private contextKey = '';
  private playerMode = '';
  private manual = false;
  private view: DockView | null = null;
  private expanded = new Set<DockView>(['command','objectives','navigation','autopilot']);
  private header=document.createElement('div');
  private sizeButton=document.createElement('button');
  private renderedView: DockView | null = null;
  constructor() {
    this.shipTabs.className='ship-tabs';this.shipTabs.setAttribute('aria-label','Ship systems');this.shipTabs.innerHTML = [
      '<button data-panel="cargo">Cargo</button>',
      featureVisible('combat') ? '<button data-panel="combat">Weapons</button>' : '',
      featureVisible('defence') ? '<button data-panel="defence">Defence</button>' : '',
      featureVisible('autopilot') ? '<button data-panel="autopilot">Flight computer</button>' : '',
    ].join('');

    this.root.id = 'operations-dock'; this.root.setAttribute('aria-label', 'Operations'); this.root.hidden = true;
    const header = this.header; header.className = 'dock-heading';
    const close = document.createElement('button'); close.type = 'button'; close.append('Close ');{const hint = document.createElement('kbd'); hint.textContent = 'Esc'; hint.setAttribute('aria-hidden', 'true'); close.append(hint);} close.setAttribute('aria-label', 'Close operations panel'); close.onclick = () => this.close();
    this.sizeButton.type='button';this.sizeButton.onclick=()=>{if(this.inspection){this.inspection=false;this.expanded.add('command');this.render();return;}if(this.view){if(this.expanded.has(this.view))this.expanded.delete(this.view);else this.expanded.add(this.view);this.render();}};this.heading.className='dock-title';this.pausedBadge.className='window-paused';this.pausedBadge.textContent='Paused while open';this.pausedBadge.setAttribute('role','status');this.pausedBadge.hidden=true;
    header.append(this.heading,this.pausedBadge,this.sizeButton,close); this.root.append(header,this.shipTabs);
    this.cargo.className = 'mining'; this.cargo.setAttribute('aria-label', 'Cargo and mining telemetry');
    this.colony.className = 'colony-panel'; this.colony.setAttribute('aria-label', 'Colony construction and production');
    this.combat.id = 'combat-content'; this.defence.id = 'defence-content';
    this.root.append(this.cargo, this.autopilot, this.colony, this.combat, this.defence, this.command, this.navigation, this.objectives);
    this.shipTabs.addEventListener('click',event=>{const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button[data-panel]');if(!button)return;this.open(button.dataset.panel as DockView);if(event.detail>0)button.blur();});
    isolateControlKeys(this.root);
  }
  update(context: HudContext, playerMode: string): void {
    if (context.key !== this.contextKey || playerMode !== this.playerMode) {
      const leftBuild=this.contextKey==='construction'&&context.key==='surface';
      const preserve=this.manual&&playerMode===this.playerMode&&!leftBuild&&!['recovery','turret'].includes(context.key);
      this.contextKey = context.key; this.playerMode = playerMode;
      if (!preserve) { this.view = context.view; this.manual = false; }
      this.render();
    }
  }
  inspectFacility(label:string):void{this.inspectionTitle=label;this.manual=true;this.view='command';this.inspection=true;this.render();}
  open(view: DockView): void {this.inspection=false;this.manual=true;this.view=view;this.render();}
  toggle(view: DockView): void { if(this.inspection&&view==='command'){this.open('command');return;}this.inspection=false;this.manual = true; this.view = this.view === view ? null : view; this.render(); }
  close(): void {
    this.manual = true; this.view = null;
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && (this.root.contains(focused) || focused.closest('#hud-chrome'))) focused.blur();
    this.render();
  }
  get current(): DockView | null { return this.view; }
  /** Base and Map in their large layout cover the world. */
  get fullScreen(): boolean {
    return !this.root.hidden && !this.inspection && this.root.dataset.expanded === 'true' && (this.view === 'command' || this.view === 'navigation');
  }
  setWindowPaused(paused: boolean): void { this.pausedBadge.hidden = !paused; this.root.dataset.windowPaused = String(paused); }
  /** Screen buttons toggle their panel. Build mode is handled by the HUD, not the dock. */
  choose(view: DockView): void { this.toggle(view); }
  private layoutControls(expanded:boolean):void {
    this.root.dataset.expanded=String(expanded);
    this.sizeButton.textContent=expanded?'↙ Compact':'↗ Expand';
    this.sizeButton.setAttribute('aria-label',expanded?'Compact operations window':'Expand operations window');
    this.sizeButton.setAttribute('aria-pressed',String(expanded));
  }
  private render(): void {
    this.root.hidden = this.view === null; this.root.dataset.panel = this.view ?? 'closed';
    if(this.view!=='command')this.inspection=false;this.root.dataset.inspection=String(this.inspection);
    const expanded=!this.inspection&&this.view!==null&&this.expanded.has(this.view);
    this.layoutControls(expanded);
    this.heading.textContent = this.view ? ({cargo:'Ship',combat:featureVisible('combat')?'Ship / Weapons':'Ship / Recovery',defence:'Ship / Defence',colony:'Build',command:'Base',navigation:'Map',objectives:'Objectives',autopilot:'Ship / Flight computer'} as const)[this.view] : '';
    if(this.inspection)this.heading.textContent=this.inspectionTitle;
    const ship=['cargo','combat','defence','autopilot'].includes(this.view??'');this.shipTabs.hidden=!ship||this.shipTabs.children.length<2;for(const b of Array.from(this.shipTabs.querySelectorAll('button')))b.setAttribute('aria-pressed',String(b.dataset.panel===this.view));
    const changed=this.renderedView!==this.view;this.renderedView=this.view;
    const sections = { autopilot:this.autopilot,cargo: this.cargo, colony: this.colony, combat: this.combat, defence: this.defence, command: this.command, navigation: this.navigation, objectives: this.objectives };
    for (const [view, section] of Object.entries(sections)) section.hidden = view !== this.view;
    if(changed)this.root.scrollTop=0;
  }
}
