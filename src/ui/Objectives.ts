import { featureVisible } from '../preferences/features';
import { OBJECTIVES, objectiveProgress, type ObjectiveId, type ObjectiveLink } from '../sim/objectives';
import { starterPlan } from '../sim/starterPlan';
import type { WorldState } from '../sim/world';
import { patchMarkup } from './dom';
import { cued, shownObjectives } from './flight/chromeView';
import { controlHint, type PresentationPreferences } from '../preferences/presentation';
import { isolateControlKeys } from './controlKeys';


const LINKS: Record<ObjectiveLink, string> = { cargo:'Open Ship / Cargo', build:'Open Build', equipment:'Open Manage / Ship fitting', map:'Open Map', research:'Open Manage / Research', defence:'Open Ship / Defence' };
const recent = (w: WorldState): string => { const lines = (w.rootWorld ?? w).exploration.events?.journal.slice(-5) ?? []; return lines.length ? `<h3>Recently</h3>${lines.map(l => `<p data-event-line>${l}</p>`).join('')}` : ''; };
export class Objectives {
 readonly content = document.createElement('section');
 private includeRecovery=false;
 private tracked: ObjectiveId | 'auto' = 'auto';
 get trackedId(): ObjectiveId | 'auto' { return this.tracked; }
 constructor(navigate: (link: ObjectiveLink, keyboard: boolean) => void) {
  this.content.id='objective-panel';
  isolateControlKeys(this.content);
  this.content.addEventListener('change',e=>{const select=e.target as HTMLSelectElement;if(select.id==='budget-recovery'){this.includeRecovery=(select as unknown as HTMLInputElement).checked;return;}if(select.id==='tracked-objective'&&(select.value==='auto'||OBJECTIVES.some(o=>o.id===select.value)))this.tracked=select.value as typeof this.tracked;});
  this.content.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLButtonElement>('button[data-objective-link]');const link=button?.dataset.objectiveLink as ObjectiveLink|undefined;if(link&&Object.hasOwn(LINKS,link)){navigate(link,e.detail===0);if(e.detail>0)button?.blur();}});
 }
 update(w:WorldState,p:PresentationPreferences):void {
  const all=shownObjectives(w), done=w.objectives.completed.filter(id=>all.some(o=>o.id===id));
  const shown=all.filter(o=>done.includes(o.id)||cued(w,o.id));
  const next=this.tracked==='auto'?shown.find(o=>!done.includes(o.id)):shown.find(o=>o.id===this.tracked);
  if(this.content.closest('[hidden]'))return;
  const progress=next?objectiveProgress(w,next.id):null, recorded=!!next&&done.includes(next.id);
  const plan=starterPlan(w,this.includeRecovery), fmt=(n:number)=>Number(n.toFixed(2));
  patchMarkup(this.content, `<label for="tracked-objective">Following</label><select id="tracked-objective"><option value="auto" ${this.tracked==='auto'?'selected':''}>Latest</option>${shown.map(o=>`<option value="${o.id}" ${this.tracked===o.id?'selected':''}>${done.includes(o.id)?'✓ ':''}${o.label}</option>`).join('')}</select>
   ${next&&progress?`<article class="tracked-goal" data-objective="${next.id}" data-complete="${recorded}"><h3>${recorded?'✓ ':''}${next.label}</h3><label for="objective-progress">${recorded?'Recorded · ':''}${fmt(progress.value)} / ${progress.target} ${progress.unit}</label><progress id="objective-progress" max="${progress.target}" value="${progress.value}"></progress><p>${controlHint(next.hint,p)}</p><button data-objective-link="${next.link}">${LINKS[next.link]}</button></article>`:'<p>Nothing pressing. Keep going at your own pace.</p>'}
   <details data-preserve-open><summary>Journal · ${done.length}</summary>${recent(w)}${(['expedition','colony'] as const).filter(g=>shown.some(o=>o.group===g)).map(group=>`<h3>${group==='expedition'?'Expedition':'Colony'}</h3>${shown.filter(o=>o.group===group).map(o=>`<p data-milestone="${o.id}">${done.includes(o.id)?'✓':'○'} ${o.label}</p>`).join('')}`).join('')}</details>
   ${featureVisible('starterBudget')?`<details id="starter-budget" data-preserve-open><summary>Selene starter-route budget</summary><p>Solar + refinery → lab + Applied materials → cargo rack. Missing work on Selene only; remote stock and ship freight are not pooled.</p>
   <label class="budget-spares"><input id="budget-recovery" type="checkbox" ${this.includeRecovery?'checked':''}> Include recovery parts in this budget</label><small>Planning allowance only; no stock is locked. Turret reserves can block recovery.</small><div class="route-budget">${plan.rows.map(r=>`<p data-budget="${r.product}"><b>${r.product}</b><br>Need ${fmt(r.need)} kg · usable ${fmt(r.usable)} kg<br><span ${r.shortfall>0?'class="budget-shortfall"':''}>Shortfall ${fmt(r.shortfall)} kg</span></p>`).join('')||'<p>You have the materials for this route.</p>'}</div>
   ${plan.raw.length?`<p>Refining inputs for the shortfall (whole cycles):</p>${plan.raw.map(r=>`<p data-raw-budget="${r.resource}">${r.resource}: ${fmt(r.need)} kg needed · ${fmt(r.inDepot)} kg in Selene depot · ${fmt(r.shortfall)} kg still to deliver</p>`).join('')}`:'<p>Materials covered. Feedstock, power and travel still count.</p>'}
   <p>Remaining research: ${fmt(plan.researchEnergy)} kJ over time.<br>Building parts: ${plan.fabricationEnergy} kJ at once, above your reserve; ${fmt(plan.usableEnergy)} kJ available now.</p>
   ${plan.missing.length?`<p>Still to fund: ${plan.missing.join(' · ')}</p>`:''}${plan.pending.length?`<p>Already committed: ${plan.pending.join(' · ')}</p>`:''}
   <small>This is a material estimate, not a purchase or a readiness guarantee. Work has to finish; keep buildings repaired and fed with ore and power. Repair wrecks or clear space for replacements. Geometry and suit/flight travel are checked when acting. Reserves reduce usable stock.</small><button data-objective-link="research">Open Manage / Research</button></details>`:''}
   ${featureVisible('catalogue')?'<small>Goals track what you do. They never hand out materials or fly for you. Track milestones in any order. K saves milestones and habitat time; tracking choice is temporary. Defence drills remain opt-in.</small>':'<small>Goals track what you do. They never hand out materials.</small>'}`);
  const select=this.content.querySelector<HTMLSelectElement>('#tracked-objective'); if(select&&document.activeElement!==select)select.value=this.tracked;
 }
}
