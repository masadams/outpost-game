import { colonyPlanet } from '../sim/localWorld';
import { flightSafety } from '../sim/flightSafety';
import type { WorldState } from '../sim/world';
import { instrumentReadings,dialMarkup,detailMarkup,readingValue } from './instruments';
import { patchMarkup,setText } from './dom';
import { isolateControlKeys } from './controlKeys';

/** Presentation-only console. Browsing telemetry never pauses or sends simulation input. */
export class InstrumentPanel {
 private expanded=false;
 private bank:HTMLElement;
 private readings:HTMLElement;
 private lamps:HTMLElement;
 private mode:HTMLElement;
 private drawer:HTMLElement;
 private button:HTMLButtonElement;
 private environment:HTMLElement;
 private flightStatus:HTMLElement|null=null;
 constructor(private root:HTMLElement,cancelAutopilot:()=>void){
  root.dataset.expanded='false';root.id='instrument-console';
  root.innerHTML='<div class="instrument-bezel"><span class="instrument-mode"></span><div class="instrument-lamps" aria-label="Active instrument cautions"></div><button type="button" class="autopilot-disengage" aria-label="Disengage autopilot" hidden></button><button type="button" data-telemetry-toggle aria-label="Show telemetry details" aria-expanded="false" aria-controls="telemetry-details">Details ▴</button></div><div class="dial-bank"></div><section id="telemetry-details" class="telemetry-details" aria-label="Detailed flight telemetry" hidden><h2>Flight diagnostics</h2><div class="detailed-readings"></div><div class="instrument-combat"></div><div class="instrument-environment"><h3>Ship coast / environment</h3></div><small>Velocities use the local surface frame. Positive V/S climbs; negative descends. Gauges auto-range; exact values remain visible.</small></section>';
  this.bank=root.querySelector('.dial-bank')!;this.readings=root.querySelector('.detailed-readings')!;this.lamps=root.querySelector('.instrument-lamps')!;this.mode=root.querySelector('.instrument-mode')!;this.drawer=root.querySelector('.telemetry-details')!;this.button=root.querySelector('[data-telemetry-toggle]')!;this.environment=root.querySelector('.instrument-environment')!;
  this.button.addEventListener('click',event=>{this.expanded=!this.expanded;root.dataset.expanded=String(this.expanded);this.drawer.hidden=!this.expanded;this.button.setAttribute('aria-expanded',String(this.expanded));this.button.setAttribute('aria-label',this.expanded?'Hide telemetry details':'Show telemetry details');this.button.textContent=this.expanded?'Details ▾':'Details ▴';if(event.detail>0)this.button.blur();});
  root.querySelector('.autopilot-disengage')!.addEventListener('click',cancelAutopilot);
  isolateControlKeys(root);
 }
 update(w:WorldState):void{
  const foot=w.playerMode==='astronaut',rows=instrumentReadings(w),safety=flightSafety(w.ship,w.system);
  const cancel=this.root.querySelector<HTMLButtonElement>('.autopilot-disengage')!;cancel.hidden=!w.autopilot.program;setText(cancel,w.autopilot.program?`AP ${w.autopilot.program.target} / ${w.autopilot.program.phase} ×`:'');
  this.root.dataset.mode=foot?'crew':'ship';
  setText(this.mode,`${foot?'EVA':safety.approach?'LANDING':'FLIGHT'} · ${colonyPlanet(w).label.toUpperCase()}${foot?` · ${w.astronaut.grounded?'GROUND':'AIR'}`:''}`);
  patchMarkup(this.bank,rows.filter(r=>r.primary).map(dialMarkup).join(''));
  patchMarkup(this.readings,detailMarkup(rows));
  patchMarkup(this.lamps,rows.filter(r=>r.key!=='speed'&&['caution','critical'].includes(r.state.level)).map(r=>`<span data-caution="${r.key}" data-level="${r.state.level}" title="${r.label}: ${r.state.label}">${r.state.level==='critical'?'!':'▲'} ${r.short}${r.key==='spin'?` ${readingValue(r)}`:''}</span>`).join(''));
  const a=w.ship.armament;setText(this.root.querySelector('.instrument-combat')!,foot?'':`${a.selected.toUpperCase()} ${a[a.selected]} · cell ${a.energy.toFixed(0)} · heat ${a.heat.toFixed(0)}${a.overheated?' · COOLING LOCK':''}`);
  // Keep the FlightTools-owned node intact; its trajectory and atmosphere updates continue here.
  this.flightStatus??=document.getElementById('flight-status');
  if(this.flightStatus&&this.flightStatus.parentElement!==this.environment)this.environment.append(this.flightStatus);
 }
}
