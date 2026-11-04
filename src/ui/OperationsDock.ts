import { isolateControlKeys } from './controlKeys';
import type { DockView, HudContext } from './context';

export class OperationsDock {
  onBuild: (()=>void)|null=null;
  buildActive=false;
  onLeaveBuild:(()=>void)|null=null;
  readonly nav = document.createElement('nav');
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
  private contextKey = '';
  private playerMode = '';
  private manual = false;
  private view: DockView | null = null;
  private expanded = new Set<DockView>(['command','objectives','navigation','autopilot']);
  objectiveButton:HTMLButtonElement|null=null;
  private objectiveHost:HTMLElement|null=null;
  private tools:HTMLElement|null=null;
  private toolHost:HTMLElement|null=null;
  private header=document.createElement('div');
  private navHost:HTMLElement|null=null;
  private sizeButton=document.createElement('button');
  private renderedView: DockView | null = null;
  constructor() {
    this.nav.className = 'dock-nav'; this.nav.setAttribute('aria-label', 'Operations panels');
    this.nav.innerHTML = `<button data-panel="cargo" aria-controls="operations-dock">Ship [I]</button><button data-panel="colony" aria-controls="operations-dock">Build</button><button data-panel="command" aria-controls="operations-dock">Manage</button><button data-panel="navigation" aria-controls="operations-dock">Map</button>`;
    this.shipTabs.className='ship-tabs';this.shipTabs.setAttribute('aria-label','Ship systems');this.shipTabs.innerHTML='<button data-panel="cargo">Cargo</button><button data-panel="combat">Weapons</button><button data-panel="defence">Defence</button><button data-panel="autopilot">Flight computer</button>';

    this.root.id = 'operations-dock'; this.root.setAttribute('aria-label', 'Operations'); this.root.hidden = true;
    const header = this.header; header.className = 'dock-heading';
    const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Close [Esc]'; close.setAttribute('aria-label', 'Close operations panel'); close.onclick = () => this.close();
    this.sizeButton.type='button';this.sizeButton.onclick=()=>{if(this.inspection){this.inspection=false;this.expanded.add('command');this.render();return;}if(this.view){if(this.expanded.has(this.view))this.expanded.delete(this.view);else this.expanded.add(this.view);this.render();}};header.append(this.heading,this.sizeButton,close); this.root.append(header,this.shipTabs);
    this.cargo.className = 'mining'; this.cargo.setAttribute('aria-label', 'Cargo and mining telemetry');
    this.colony.className = 'colony-panel'; this.colony.setAttribute('aria-label', 'Colony construction and production');
    this.combat.id = 'combat-content'; this.defence.id = 'defence-content';
    this.root.append(this.cargo, this.autopilot, this.colony, this.combat, this.defence, this.command, this.navigation, this.objectives);
    const choose=(event:MouseEvent)=>{const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button[data-panel]');if(!button)return;const view=button.dataset.panel as DockView;if(view==='colony'&&this.view==='colony'&&!this.buildActive){this.onBuild?.();if(event.detail>0)button.blur();return;}if(this.shipTabs.contains(button))this.open(view);else this.toggle(view);if(view==='colony'&&this.view==='colony')this.onBuild?.();if(event.detail>0)button.blur();};
    this.nav.addEventListener('click',choose);this.shipTabs.addEventListener('click',choose);
    isolateControlKeys(this.nav); isolateControlKeys(this.root);
  }
  update(context: HudContext, playerMode: string): void {
    if (context.key !== this.contextKey || playerMode !== this.playerMode) {
      const preserve=this.manual&&playerMode===this.playerMode&&!['recovery','turret'].includes(context.key);
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
    if (focused instanceof HTMLElement && (this.root.contains(focused) || this.nav.contains(focused) || focused.id==='objectives')) focused.blur();
    this.render();
  }
  /** Move the existing controls, preserving their listeners and accessible names. */
  private layoutControls(expanded:boolean):void {
    this.root.dataset.expanded=String(expanded);
    if(expanded){
      if(this.objectiveButton&&this.objectiveButton.parentElement!==this.nav){
        this.objectiveHost=this.objectiveButton.parentElement;
        this.nav.append(this.objectiveButton);
      }
      this.tools??=document.getElementById('sound-panel');
      if(this.tools&&this.tools.parentElement!==this.header){
        this.toolHost=this.tools.parentElement;
        this.header.insertBefore(this.tools,this.sizeButton);
      }
      if(this.nav.parentElement!==this.root){
        this.navHost=this.nav.parentElement;
        this.root.insertBefore(this.nav,this.shipTabs);
      }
    }else{
      if(this.objectiveButton&&this.objectiveHost&&this.objectiveButton.parentElement===this.nav)this.objectiveHost.append(this.objectiveButton);
      if(this.tools&&this.toolHost&&this.tools.parentElement===this.header)this.toolHost.append(this.tools);
      if(this.navHost&&this.nav.parentElement===this.root)this.navHost.append(this.nav);
    }
    this.sizeButton.textContent=expanded?'↙ Compact':'↗ Expand';
    this.sizeButton.setAttribute('aria-label',expanded?'Compact operations window':'Expand operations window');
    this.sizeButton.setAttribute('aria-pressed',String(expanded));
  }
  private render(): void {
    if(this.view!=='colony'&&this.buildActive){this.buildActive=false;this.onLeaveBuild?.();}
    this.root.hidden = this.view === null; this.root.dataset.panel = this.view ?? 'closed';
    if(this.view!=='command')this.inspection=false;this.root.dataset.inspection=String(this.inspection);
    const expanded=!this.inspection&&this.view!==null&&this.expanded.has(this.view);
    this.layoutControls(expanded);
    this.heading.textContent = this.view ? ({cargo:'Ship / Cargo',combat:'Ship / Weapons',defence:'Ship / Defence',colony:'Build',command:'Manage colony',navigation:'Map',objectives:'Objectives',autopilot:'Ship / Flight computer'} as const)[this.view] : '';
    if(this.inspection)this.heading.textContent=this.inspectionTitle;
    const ship=['cargo','combat','defence','autopilot'].includes(this.view??'');this.shipTabs.hidden=!ship;for(const b of Array.from(this.shipTabs.querySelectorAll('button')))b.setAttribute('aria-pressed',String(b.dataset.panel===this.view));
    const changed=this.renderedView!==this.view;this.renderedView=this.view;
    const sections = { autopilot:this.autopilot,cargo: this.cargo, colony: this.colony, combat: this.combat, defence: this.defence, command: this.command, navigation: this.navigation, objectives: this.objectives };
    for (const [view, section] of Object.entries(sections)) section.hidden = view !== this.view;
    if(changed)this.root.scrollTop=0;
    for (const button of Array.from(this.nav.querySelectorAll<HTMLButtonElement>('button[data-panel]'))) {
      const selected = button.dataset.panel === this.view || button.dataset.panel==='cargo'&&ship;
      button.setAttribute('aria-expanded', String(selected)); button.classList.toggle('selected', selected);
    }
  }
}
