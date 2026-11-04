import { fuelPlan,recoveryReadiness } from '../sim/readiness';
import { BLUEPRINTS } from '../sim/colonyConfig';
import { fuelCapacity } from '../sim/shipStats';
import type { WorldState } from '../sim/world';
const fmt=(n:number)=>Number(n.toFixed(2));
const shortage=(n:number)=>n>0&&n<.01?'&lt;0.01':fmt(n);
export function readinessPanel(w:WorldState,paused:boolean,requested:number):string{
 const recovery=recoveryReadiness(w),fuel=fuelPlan(w,requested),short=recovery.rows.filter(r=>r.shortfall>0);
 return `<p class="readiness-summary" data-recovery-funded="${recovery.funded}">HOME RECOVERY · ${recovery.funded?'Parts funded':short.map(r=>`short ${shortage(r.shortfall)} kg ${r.product}`).join(' · ')}</p><details class="readiness-panel" data-preserve-open><summary>Expedition readiness & refuelling</summary>
 <h3>Recovery at Selene</h3>${recovery.rows.map(r=>`<p data-recovery-material="${r.product}">${r.product}: need ${r.need} kg · usable ${fmt(r.usable)} / ${fmt(r.stock)} kg · short ${shortage(r.shortfall)} kg</p>`).join('')}
 <p>Recovery returns the ship home at ${recovery.hull}% hull and at most ${recovery.fuel.toFixed(1)} kg of its remaining fuel. Fitted parts survive; ${fmt(recovery.lostCargo)} kg cargo would be lost. Capacity upgrades are never filled.</p>
 <p>Full hull repair afterward: up to ${fmt(recovery.repairAlloy)} additional alloy. Full rearm: ${fmt(recovery.rearmAlloy)} alloy + ${fmt(recovery.rearmComponents)} components. These use the same stock; funded recovery alone does not cover them.</p>
 ${w.ship.state==='crashed'?`<button ${paused||!recovery.canRecover?'disabled':''} data-colony="recoverShip">Recover ship with home supplies</button>`:''}
 <h3>Fuel at ${fuel.label}</h3><p>Aboard ${fmt(w.ship.fuel)} / ${fuelCapacity(w.ship)} kg · local stock ${fmt(fuel.stock)} kg. ${fuel.transfer>0?`Aboard the landed ship, E can transfer up to ${fmt(fuel.transfer)} kg.`:fuel.here?'Land here and use E aboard to transfer available fuel.':'The ship is elsewhere; local fuel cannot refuel it remotely.'}</p>
 <label for="fuel-plan-amount">Additional fuel to produce · kg</label><input id="fuel-plan-amount" type="number" min="0" max="1000" step="1" value="${Number.isFinite(requested)?requested:''}">
 ${fuel.error?`<p class="budget-shortfall" role="status">${fuel.error}</p>`:`<div class="fuel-plan" role="status"><p>${fuel.cycles} whole fuel cycles → ${fmt(fuel.output)} kg fuel. Need ${fmt(fuel.water)} kg water + ${fmt(fuel.oxygen)} kg oxygen.</p><p>Product shortfall: ${fmt(fuel.missingWater)} water + ${fmt(fuel.missingOxygen)} oxygen.<br>Refine ${fmt(fuel.ice)} kg ice in ${fuel.iceCycles} shared co-product cycles; ${fmt(fuel.iceToDeliver)} kg still to deliver to ${fuel.label}.</p><p>Work at full power: ${fmt(fuel.fuelWork)} s fuel + ${fmt(fuel.iceWork)} s ice refining; ${fmt(fuel.energy)} kJ total. Concurrent load asks ${fuel.concurrentPower} kW; generation now ${fmt(w.colony.generation)} kW. Stored unreserved charge ${fmt(fuel.usableEnergy)} kJ. Short supply or priorities can serialize or stop work.</p></div>`}
 <p>Healthy enabled fuel processor: ${fuel.processor?'yes':`needed · ${Object.entries(BLUEPRINTS.fuelProcessor.cost).map(([p,n])=>`${n} ${p}`).join(' + ')}`}. Refinery: ${fuel.refinery?'yes · choose ice processing when needed':'needed for ice → water + oxygen'}.</p>
 <small>Inspection only: this input starts no production or transfer. Whole-cycle estimates assume no competing use; habitat air shares oxygen stock. Ship freight and other-world stocks are not pooled. No range or safe-return guarantee: mass, steering, burn and atmosphere matter.</small><button data-readiness-view="command">Manage local industry</button><button data-readiness-view="colony">Open local Build</button></details>`;
}
