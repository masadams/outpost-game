import { policyPanel } from './colonyPolicy';
import { blueprintVisible, featureVisible, type Feature } from '../preferences/features';
import {applyPresentation} from '../preferences/presentation';
import {buildingUpgradePanel} from './buildingUpgrade';
import { physicalKey, type PresentationPreferences } from '../preferences/presentation';
import { icon } from './icons';
import { PART_SLOTS, TECH_IDS, UPGRADE_IDS, UPGRADES, type UpgradeId, type PartSlot, type TechId } from '../sim/progressionConfig';
import type { BodyId } from '../sim/celestial';
import { colonyPlanet, colonyWorld, activeWorld } from '../sim/localWorld';
import { shieldDetails, shieldPanel } from './shields';
import { progressionPanel, progressionAction, type ResearchFilter } from './progression';
import { orderError } from '../sim/construction';
import { BLUEPRINTS, BUILD_TYPES, PRODUCTS, type ProductInventory, type BuildType } from '../sim/colonyConfig';
import { energyCapacity, oreCapacity, productCapacity, recipeFor, type ColonyAction } from '../sim/colony';
import { CONSTRUCTION_SECONDS, type CommandAction, type RemoteOperation } from '../sim/commandConfig';
import { orderedBuildings, ratedPower } from '../sim/power';
import { isTurret, WEAPONS } from '../sim/defenceConfig';
import { SCHEDULE_PRODUCTS } from '../sim/scheduling';
import { availableProduct, policyFor } from '../sim/colonyPolicy';
import { RESOURCES, inventoryMass } from '../sim/resources';
import { habitatDetails } from './habitats';
import { patchMarkup } from './dom';
import type { WorldState } from '../sim/world';
const escapeText = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const PAGES={facilities:['facilities','Facilities'],research:['research','Research'],equipment:['drive','Ship fitting'],queue:['queue','Construction'],economy:['economy','Economy'],shields:['armour','Shields']} as const;
type ManagePage=keyof typeof PAGES;
const PAGE_FEATURES: Partial<Record<ManagePage, Feature>> = { research: 'research', equipment: 'shipFitting', shields: 'shields' };
const pageVisible = (page: ManagePage): boolean => {
  const feature = PAGE_FEATURES[page];
  return !feature || featureVisible(feature);
};
const fmt = (n: number) => n.toFixed(1);
export class CommandConsole {
  readonly root = document.createElement('section');
  selected: number | null = null;
  shieldAccents = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  preview: { kind: BuildType; angle: number; valid: boolean } | null = null;
  private paused = false;
  private body: BodyId | 'local' = 'local';
  get bodyId(): BodyId { return this.world?.siteBody ?? 'home'; }
  private dispatch(action: ColonyAction): void { this.issue({ ...action, body: this.bodyId }); }
  private site = 120;
  private blueprint: BuildType = BUILD_TYPES[0];
  private world: WorldState | null = null;
  private requestedSelection: number|null=null;
  private selectionByKeyboard=false;
  private partSlot:PartSlot='hold';
  private researchFilter:ResearchFilter='all';
  private page:ManagePage='facilities';
  private selectedTech:TechId='materials';
  private selectedPart:UpgradeId='cargo';
  private requestedTech:TechId|null=null;
  private renderedPage:ManagePage|null=null;
  private requestedSection: { name: 'research'|'equipment'; keyboard: boolean } | null = null;
  showLocal():void{this.body='local';this.requestedSection=null;this.requestedTech=null;}
  inspectPart(part:UpgradeId):void{this.body='home';this.partSlot=UPGRADES[part].slot;this.selectedPart=part;this.page='equipment';this.requestedSection={name:'equipment',keyboard:true};}
  openSection(name: 'research'|'equipment', keyboard=false): void { this.body='home'; this.page=name;this.requestedSection={name,keyboard}; }
  private sampleTime = 0;
  private previous = new Map<string, number>();
  private rates = new Map<string, number>();
  constructor(private issue: (a: ColonyAction) => void, private preferences:PresentationPreferences) {
    this.root.id = 'command-console'; this.root.setAttribute('aria-label', 'Central Command');
    this.root.addEventListener('click', e => {
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button'); if (!button || button.disabled) return;
      const d = button.dataset, id = Number(d.id);
      if(d.buildingLabels){this.preferences.buildingLabels=!this.preferences.buildingLabels;applyPresentation(this.preferences);this.refresh();return;}
      if(d.page&&d.page in PAGES){this.page=d.page as ManagePage;if(this.page==='research')this.requestedTech=this.selectedTech;this.refresh();return;}
      if(d.partSlot&&PART_SLOTS.includes(d.partSlot as PartSlot)){this.chooseSlot(d.partSlot as PartSlot);this.refresh();return;}
      if(d.partFocus&&UPGRADE_IDS.includes(d.partFocus as UpgradeId)){this.selectedPart=d.partFocus as UpgradeId;this.refresh();return;}
      if(d.unlockPart&&UPGRADE_IDS.includes(d.unlockPart as UpgradeId)){this.selectedPart=d.unlockPart as UpgradeId;this.partSlot=UPGRADES[this.selectedPart].slot;this.page='equipment';this.refresh();return;}
      if(d.techFocus&&TECH_IDS.includes(d.techFocus as TechId)){this.page='research';this.selectedTech=d.techFocus as TechId;this.requestedTech=this.selectedTech;this.refresh();return;}
      if (d.locate) { this.selected = Number(d.locate);this.requestedSelection=this.selected;this.selectionByKeyboard=e.detail===0;if(e.detail>0)button.blur();return; }
      if (this.paused) return;
      if(d.upgradeBuilding){const level=Number(d.upgradeTier);if(level===2||level===3)this.dispatch({type:'upgradeBuilding',id:Number(d.upgradeBuilding),level});if(e.detail>0)button.blur();return;}
      const progress = progressionAction(button); if (progress) { this.dispatch(progress); if (e.detail > 0) button.blur(); return; }
      let action: CommandAction | undefined;
      if (d.remote) action = { type: 'remote', id, operation: d.remote as RemoteOperation };
      if (d.move && this.world) {
        const list = orderedBuildings(this.world.colony), i = list.findIndex(b => b.id === id), next = d.move === 'up' ? list[i - 1]?.id : list[i + 2]?.id ?? null;
        if (next !== undefined) action = { type: 'priority', id, before: next };
      }
      if (d.product) action = { type: 'remoteTarget', id, product: d.product, delta: Number(d.delta) };
      if (d.order) action = { type: 'queueControl', id, operation: d.order as 'pause' | 'cancel' };
      if (d.enqueue) action = { type: 'queueBuild', kind: this.blueprint, angle: this.site / colonyPlanet(this.world!).radius };
      if (action) this.dispatch(action);
      if (e.detail > 0) button.blur();
    });
    this.root.addEventListener('change', e => {
      const view=e.target as HTMLSelectElement;if(view.id==='equipment-slot'&&PART_SLOTS.includes(view.value as PartSlot)){this.chooseSlot(view.value as PartSlot);this.refresh();return;}if(view.id==='research-filter'&&['available','all','complete'].includes(view.value)){this.researchFilter=view.value as ResearchFilter;this.refresh();return;}
      const el = e.target as HTMLInputElement;
      if (el.id === 'command-body' && ['home', 'moon', 'local'].includes(el.value)) { this.body = el.value as typeof this.body; if (this.world) this.update(activeWorld(this.world), this.paused); return; }
      if (el.id === 'shield-accents') this.shieldAccents = el.checked;
      if (el.dataset.limit && !this.paused) this.dispatch({ type: 'powerLimit', id: Number(el.dataset.limit), percent: Number(el.value) });
      if (el.id === 'command-site') this.site = Number(el.value);
      if (el.id === 'command-blueprint') this.blueprint = el.value as typeof this.blueprint;
    });
    this.root.addEventListener('dragstart', e => {
      const row = (e.target as HTMLElement).closest<HTMLElement>('[data-facility]');
      if (!row || this.paused) { e.preventDefault(); return; }
      e.dataTransfer?.setData('application/x-outpost-facility', row.dataset.facility!);
    });
    this.root.addEventListener('dragover', e => { if (!this.paused) e.preventDefault(); });
    this.root.addEventListener('drop', e => {
      e.preventDefault(); const row = (e.target as HTMLElement).closest<HTMLElement>('[data-facility]');
      const id = Number(e.dataTransfer?.getData('application/x-outpost-facility'));
      if (row && id && id !== Number(row.dataset.facility) && !this.paused) this.dispatch({ type: 'priority', id, before: Number(row.dataset.facility) });
    });
    this.root.addEventListener('keydown',event=>{const target=event.target as HTMLElement;if(!target.matches('.tech-node')||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const nodes=Array.from(this.root.querySelectorAll<HTMLButtonElement>('.tech-node')),index=nodes.indexOf(target as HTMLButtonElement),next=nodes[(index+(event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1)+nodes.length)%nodes.length];next.focus();next.scrollIntoView({block:'nearest',inline:'nearest'});});
    // Editing fields and dragging cannot thrust, walk, fire or invoke build shortcuts.
    for (const name of ['keydown', 'keyup']) this.root.addEventListener(name, e => {
      const k=e as KeyboardEvent,code=physicalKey(k.code);if(!(['ESC','P','K','L','M','H'] as const).some(slot=>(this.preferences.bindings[slot]??slot)===code))k.stopPropagation();
    });
  }
  private chooseSlot(slot:PartSlot):void{this.partSlot=slot;this.selectedPart=UPGRADE_IDS.find(id=>UPGRADES[id].slot===slot)!;}
  private refresh():void{if(this.world)this.update(this.world,this.paused);}
  private renderPage():void{
    if(!pageVisible(this.page))this.page='facilities';
    if(this.renderedPage!==this.page){this.root.closest<HTMLElement>('#operations-dock')?.scrollTo({top:0});this.renderedPage=this.page;}
    this.root.dataset.page=this.page;
    for(const el of Array.from(this.root.querySelectorAll<HTMLElement>(':scope > [data-workspace-page]'))){el.hidden=el.dataset.workspacePage!==this.page;if(el instanceof HTMLDetailsElement&&!el.hidden)el.open=true;}
    for(const b of Array.from(this.root.querySelectorAll<HTMLButtonElement>('[data-page]')))b.setAttribute('aria-pressed',String(b.dataset.page===this.page));
  }
  selectFacility(body: BodyId,id:number):void {this.page='facilities';this.body=body;if(this.world)this.update(colonyWorld(this.world,body),this.paused);this.selected=id;this.requestedSelection=id;this.selectionByKeyboard=false;}
  update(source: WorldState, paused: boolean): void {
    const w = this.body === 'local' ? source : colonyWorld(source, this.body);
    const focused = document.activeElement instanceof HTMLElement && this.root.contains(document.activeElement) ? document.activeElement.dataset.focus : undefined;
    this.paused = paused;
    const c = w.colony, now = c.command.elapsed;
    const stocks = new Map<string, number>([...RESOURCES.map(r => [r, w.depot[r]] as [string, number]), ...PRODUCTS.map(p => [p, c.products[p]] as [string, number])]);
    if (this.world !== w || now < this.sampleTime) { this.rates.clear(); this.previous = stocks; this.sampleTime = now; this.selected = null; }
    if (now - this.sampleTime >= 1) { for (const [p, q] of stocks) this.rates.set(p, (q - (this.previous.get(p) ?? q)) / (now - this.sampleTime)); this.previous = stocks; this.sampleTime = now; }
    const reveal=this.requestedSelection!==null,keyboard=this.selectionByKeyboard;
    this.world = w;
    if(this.requestedSelection!==null){this.selected=this.requestedSelection;this.requestedSelection=null;}
    if (!c.buildings.some(b => b.id === this.selected)) this.selected = c.buildings[0]?.id ?? null;
    const siteError = orderError(w, this.blueprint, this.site / colonyPlanet(w).radius);
    this.preview = this.page==='queue' && this.root.querySelector('#command-site')?.closest('details')?.open ? { kind: this.blueprint, angle: this.site / colonyPlanet(w).radius, valid: !siteError } : null;
    const selected = c.buildings.find(b => b.id === this.selected), policy = policyFor(c), disabled = paused ? 'disabled' : '';
    const net = c.generation - c.demand, remaining = net < -.01 ? `${fmt(c.energy / -net)} s estimated` : 'balanced / charging';
    const warn = c.buildings.filter(b => ['wrecked', 'no power', 'air low', 'no feedstock', 'power reserved', 'output full', 'shield breached', 'shield charging'].includes(b.status));
    const action = (operation: RemoteOperation, label: string) => `<button ${disabled} data-id="${selected!.id}" data-remote="${operation}">${label}</button>`;
    const recipe = selected ? recipeFor(selected) : null;
    const card = selected ? `<article class="command-machine" data-selected="${selected.id}"><h3>#${selected.id} · ${BLUEPRINTS[selected.kind].label}</h3><p class="facility-location">${colonyPlanet(w).label} · local grid and inventory</p><p>${selected.status} · hull ${fmt(selected.health ?? 100)}%</p>
      ${!['battery', 'storage'].includes(selected.kind) ? action('toggle', selected.enabled ? 'Disable selected' : 'Enable selected') : '<small>Passive capacity · no switch</small>'}
      ${ratedPower(selected) ? `<label for="command-limit">Power limit · ${selected.dispatch?.limit ?? 100}% of ${ratedPower(selected)} kW</label><input ${disabled} id="command-limit" aria-label="Selected facility power limit" data-limit="${selected.id}" type="range" min="0" max="100" step="10" value="${selected.dispatch?.limit ?? 100}"><p>Grid actual ${fmt(selected.gridPower ?? 0)} / request ${fmt(selected.requestedPower ?? 0)} kW</p>` : isTurret(selected.kind) ? `<p>Burst load · ${WEAPONS[selected.kind].energy} kJ / shot · protected materials allowed</p>${action('auto', `Automatic defence: ${selected.turret?.automatic ? 'on' : 'off'}`)}` : ''}
      ${selected.kind === 'refinery' ? `${action('recipe', 'Next selected recipe')}${action('schedule', `Auto recipes: ${selected.schedule?.enabled ? 'on' : 'off'}`)}${selected.schedule ? SCHEDULE_PRODUCTS.map(p => `<div class="command-target"><span>${p} ${selected.schedule!.targets[p]} kg</span><button ${disabled} aria-label="Lower selected ${p} target" data-id="${selected.id}" data-product="${p}" data-delta="-5">−</button><button ${disabled} aria-label="Raise selected ${p} target" data-id="${selected.id}" data-product="${p}" data-delta="5">+</button></div>`).join('') : ''}` : ''}
      ${recipe ? `<p>${recipe.label} · ${fmt(selected.progress)} / ${recipe.seconds} work s</p><small>Paid cycle progress is retained when throttled or starved; changing the manual recipe discards work.</small>` : ''}
      ${selected.kind === 'service' ? action('service', 'Request supplied service') + '<small>2 kJ + actual supplies. Crew within 18 m or landed ship within 80 m; no remote healing.</small>' : ''}${habitatDetails(selected)}${shieldDetails(selected)}${buildingUpgradePanel(w,selected,paused)}</article>` : '<p>No facilities yet. Queue a supplied site below.</p>';
    const stockRows = [...stocks].map(([p, q]) => `<tr><th>${p}</th><td>${fmt(q)}</td><td>${PRODUCTS.includes(p as keyof ProductInventory) ? fmt(availableProduct(c, p as keyof ProductInventory)) : '—'}</td><td>${this.rates.has(p) ? `${(this.rates.get(p)! >= 0 ? '+' : '') + this.rates.get(p)!.toFixed(2)}` : '—'}</td></tr>`).join('');
    const policyHtml = `<div data-workspace-page="economy">${policyPanel(w, this.paused)}</div>`;
    patchMarkup(this.root, `<div class="workspace-toolbar"><label for="command-body">COMMAND · ${colonyPlanet(w).label.toUpperCase()} COLONY</label><select id="command-body" aria-label="Command colony"><option value="local" ${this.body === 'local' ? 'selected' : ''}>Nearby world</option><option value="home" ${this.body === 'home' ? 'selected' : ''}>Selene · home</option><option value="moon" ${this.body === 'moon' ? 'selected' : ''}>Nacre · moon</option></select><button data-building-labels="true" aria-pressed="${this.preferences.buildingLabels}">Building labels: ${this.preferences.buildingLabels?'on':'off'}</button><span class="workspace-live">${paused?'Ⅱ Paused · inspect only':'● Live · [P] pause'}</span></div><button class="full-command-link" data-full-command="true">Open full colony management</button><nav class="manage-sections" aria-label="Manage sections">${Object.entries(PAGES).filter(([page])=>pageVisible(page as ManagePage)).map(([page,[symbol,label]])=>`<button data-page="${page}" aria-pressed="${page===this.page}">${icon(symbol)}<span>${label}</span></button>`).join('')}</nav>
      <div class="command-flow" data-workspace-page="facilities"><span>SOLAR ${fmt(c.generation)} kW</span><b>↓</b><span>BUS ${fmt(c.energy)} / ${energyCapacity(c)} kJ</span><meter aria-label="Colony energy" min="0" max="${energyCapacity(c)}" value="${c.energy}"></meter><b>↓</b><span>LOAD ${fmt(c.demand)} kW · ${remaining}</span></div>
      <small data-workspace-page="facilities">Life support → shield upkeep → backup and shield charging → priority industry → turret bursts. Charging uses spare unreserved charge. Requested load is conditional; time-to-shortfall is an estimate.</small>
      <p class="command-alert" data-quiet="${!warn.length&&!w.defence.meteors.length&&!w.combat.enemies.length}" role="status">${w.defence.meteors.length || w.combat.enemies.length ? 'THREATS ACTIVE · ' : ''}${warn.length ? `${warn.length} facility alerts · ${warn.slice(0, 3).map(b => `#${b.id} ${b.status}`).join(' · ')}` : 'Facilities nominal'}</p>
      <details open data-workspace-page="facilities"><summary>Facilities · ${c.buildings.length}</summary><div class="command-map" aria-label="Colony surface map">${c.buildings.map(b => `<button data-locate="${b.id}" aria-label="Locate facility ${b.id}">${Math.round(b.angle * colonyPlanet(w).radius)} m · #${b.id}</button>`).join('')}</div><small>Drag rows to reorder; ↑ / ↓ gives the same priority control. Selection highlights the actual building.</small>
      <div class="command-list">${orderedBuildings(c).map((b, i, list) => `<div draggable="${!paused}" data-facility="${b.id}" class="command-row ${b.id === this.selected ? 'selected' : ''}"><button data-focus="select-${b.id}" data-locate="${b.id}" aria-pressed="${b.id === this.selected}" aria-label="Select facility ${b.id}">#${b.id} ${BLUEPRINTS[b.kind].label}</button><button ${disabled || i === 0 ? 'disabled' : ''} data-focus="up-${b.id}" data-id="${b.id}" data-move="up" aria-label="Raise facility ${b.id} priority">↑</button><button ${disabled || i === list.length - 1 ? 'disabled' : ''} data-focus="down-${b.id}" data-id="${b.id}" data-move="down" aria-label="Lower facility ${b.id} priority">↓</button></div>`).join('')}</div>${card}</details>
      <details data-workspace-page="queue"><summary>Construction queue · ${c.command.queue.length}</summary><small>8 s stationary crew work within 96 m per order. Materials commit now; unworked fraction is refunded on cancel if storage fits. Pause lets later orders run.</small>
      <label for="command-blueprint">Blueprint</label><select ${disabled} id="command-blueprint">${BUILD_TYPES.filter(k => blueprintVisible(k)).map(k => `<option ${k === this.blueprint ? 'selected' : ''} value="${k}">${BLUEPRINTS[k].label}</option>`).join('')}</select>
      <p>Commit ${Object.entries(BLUEPRINTS[this.blueprint].cost).map(([p, q]) => `${q} ${p}`).join(' · ')}</p><p class="command-site-status">${siteError ?? 'Site clear · ghost preview in world'}</p>
      <label for="command-site">Site · metres along surface from this pad</label><input ${disabled} id="command-site" type="number" min="-1000" max="1000" step="1" value="${this.site}"><button ${disabled || siteError ? 'disabled' : ''} data-enqueue="true">Queue paid construction</button>
      ${c.command.queue.map(o => `<article class="command-order" data-order="${o.id}"><p>#${o.id} ${BLUEPRINTS[o.kind].label} · ${Math.round(o.angle * colonyPlanet(w).radius)} m<br>${escapeText(o.status)}<br>Unworked refund: ${Object.entries(BLUEPRINTS[o.kind].cost).map(([p, q]) => `${fmt(q * Math.max(0, 1 - o.progress / CONSTRUCTION_SECONDS))} ${p}`).join(' · ')}</p><progress aria-label="Order ${o.id} progress" max="${CONSTRUCTION_SECONDS}" value="${o.progress}"></progress><button ${disabled} data-order="pause" data-id="${o.id}">${o.paused ? 'Resume' : 'Pause'} order ${o.id}</button><button ${disabled} data-order="cancel" data-id="${o.id}">Cancel order ${o.id}</button></article>`).join('')}</details>
      ${progressionPanel(w, paused,this.partSlot,this.researchFilter,this.selectedTech,this.selectedPart)}${shieldPanel(w, this.shieldAccents)}
      <details data-workspace-page="economy"><summary>Economy · stocks and observed flow</summary><p>Ore ${fmt(inventoryMass(w.depot))} / ${oreCapacity(c)} kg · products ${productCapacity(c)} kg each</p><small>Net stock change / simulated second; includes deliveries, construction, refunds and habitat transfers. No offline production. — means sampling.</small><table><thead><tr><th>Stock</th><th>kg</th><th>usable</th><th>kg/s</th></tr></thead><tbody>${stockRows}</tbody></table><p>Protected energy ${policy.energyReserve} kJ · delivery room ${policy.deliveryReserve} kg<br>Habitat oxygen spent ${fmt(c.oxygenUsed)} kg</p><small>Set reserves in Build → Resource priorities.</small></details>${policyHtml}`);
    this.renderPage();
    const slider = this.root.querySelector<HTMLInputElement>('#command-limit');
    if (slider && document.activeElement !== slider && selected) slider.value = String(selected.dispatch?.limit ?? 100);
    if (focused) {
      const next = this.root.querySelector<HTMLButtonElement>(`[data-focus="${focused}"]`);
      if (next && document.activeElement !== next) (next.disabled ? this.root.querySelector<HTMLButtonElement>(`[data-focus="select-${next.dataset.id}"]`) : next)?.focus({ preventScroll: true });
    }
    if(this.requestedTech){const tech=this.root.querySelector<HTMLElement>(`[data-tech="${this.requestedTech}"]`);if(tech){const viewport=tech.closest<HTMLElement>('.tree-viewport');if(viewport)viewport.scrollTo({left:Math.max(0,tech.offsetLeft-(viewport.clientWidth-tech.offsetWidth)/2),top:Math.max(0,tech.offsetTop-(viewport.clientHeight-tech.offsetHeight)/2)});tech.focus({preventScroll:true});this.requestedTech=null;}}
    if(this.requestedSection){const request=this.requestedSection;this.page=request.name;this.renderPage();if(request.keyboard)this.root.querySelector<HTMLButtonElement>(`[data-page="${request.name}"]`)?.focus({preventScroll:true});this.requestedSection=null;}
    if(reveal){const card=this.root.querySelector<HTMLElement>('.command-machine');if(card){const details=card.closest('details');if(details)details.open=true;card.scrollIntoView({block:'start'});if(keyboard){const control=card.querySelector<HTMLButtonElement>('button:not(:disabled)');if(control)control.focus({preventScroll:true});else{card.tabIndex=-1;card.focus({preventScroll:true});}}}this.selectionByKeyboard=false;}
  }
}
