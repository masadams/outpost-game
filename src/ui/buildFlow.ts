import { BLUEPRINTS } from '../sim/colonyConfig';
import { colonyPlanet } from '../sim/localWorld';
import { orderError } from '../sim/construction';
import { previewAngle } from '../sim/colony';
import type { WorldState } from '../sim/world';
export interface BuildDraft {kind:WorldState['colony']['selected'];angle:number;valid:boolean;body:'home'|'moon';error:string|null}
export function buildFlow(w:WorldState,paused:boolean,draft?:BuildDraft|null):string {
 const body=colonyPlanet(w),angle=draft?.body===body.id?draft.angle:previewAngle(w),error=draft?.body===body.id?draft.error:orderError(w,w.colony.selected,angle),disabled=paused?'disabled':'';
 const order=w.crewOrder,canWork=w.playerMode==='astronaut'&&w.astronaut.grounded&&w.astronaut.health>0;
 return `<section class="build-flow"><h3>Build on ${body.label}</h3><p class="build-site" role="status">${error??'Site clear · materials commit when queued'} · ${Math.round(angle*body.radius)} m along the rim</p>
 <label for="build-site">Build site · metres from pad</label><input id="build-site" type="number" step="1" min="${-Math.PI*body.radius}" max="${Math.PI*body.radius}" value="${Math.round(angle*body.radius)}"><button ${disabled||error?'disabled':''} data-queue-site="${angle}" data-kind="${w.colony.selected}" data-body="${body.id}">Queue ${BLUEPRINTS[w.colony.selected].label} at preview · 8 s crew work</button>
 <p>${order?`Crew order: ${order.type==='build'?'dispatching / building':'walking to waypoint'} · ${order.body==='home'?'Selene':'Nacre'}`:'Crew idle · right click the ground to walk on foot'}</p>
 <button ${disabled||!canWork||!w.colony.command.queue.some(o=>!o.paused)?'disabled':''} data-crew="build" data-body="${body.id}">Dispatch crew to build queue</button><small>${canWork?'Orders use real walking, suit air and work time. A/D, jump, boarding or turret control cancels them.':'F deploys crew. You can plan paid work from the ship; crew must reach it on this world.'} The local grid is shared; click a facility for Manage for real power controls.</small>
 <details data-preserve-open><summary>Work queue · ${w.colony.command.queue.length}</summary>${w.colony.command.queue.map(o=>`<article><b>#${o.id} ${BLUEPRINTS[o.kind].label}</b><p>${o.status} · ${o.progress.toFixed(1)} / 8 s</p><button ${disabled} data-work-order="${o.id}" data-work-operation="pause" data-body="${body.id}">${o.paused?'Resume':'Pause'} work order ${o.id}</button><button ${disabled} data-work-order="${o.id}" data-work-operation="cancel" data-body="${body.id}">Cancel work order ${o.id}</button></article>`).join('')||'<p>No paid orders. Queue a site, then dispatch crew.</p>'}</details></section>`;
}
