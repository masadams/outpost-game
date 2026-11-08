import { featureVisible } from '../preferences/features';
import {buildingUpgradeError} from '../sim/buildingUpgrades';
import {facilityLevel,upgradeCost,capacityFactor,workFactor} from '../sim/facilityStats';
import type {WorldState} from '../sim/world';
import type {Building} from '../sim/colony';
import {materialCost} from './techTree';
export function buildingUpgradePanel(w:WorldState,b:Building,paused:boolean):string{
  if (!featureVisible('upgrades')) return '';
 const level=facilityLevel(b),error=buildingUpgradeError(w,b),next=level===1?2:3;
 const effects=['solar','battery','storage'].includes(b.kind)?`Capacity/output ×${capacityFactor(b)} → ×${next===2?1.5:2}`:['refinery','fuelProcessor','miningRig','researchLab'].includes(b.kind)?`Work and power ×${workFactor(b)} → ×${next===2?1.25:1.5}`:'Existing operating output, range and buffers retained';
 return `<section class="facility-upgrade" aria-label="Facility upgrade"><h3>Facility tier ${level} / 3</h3>${level===3?'<p>Maximum tier · 30% less incoming structural damage</p>':`<p>${effects}<br>Structural damage reduction ${level===1?0:15}% → ${next===2?15:30}%</p><div class="material-cost">${materialCost(upgradeCost(b,next))}</div><p>${next===2?20:40} kJ local grid charge</p><button ${paused||error?'disabled':''} data-upgrade-building="${b.id}" data-upgrade-tier="${next}">Upgrade facility ${b.id} to tier ${next}</button><p class="action-reason">${paused?'Paused · resume to upgrade':error??'Ready · keeps its contents and progress'}</p><details data-preserve-open class="facility-upgrade-rules"><summary>Upgrade rules</summary><small>Full repair required first. Upgrades use this base's free stock. Existing contents, progress, power limits and schedules stay intact. Added capacity starts empty. Faster work draws proportionally more power; habitats, shields, service and turrets gain structural protection. No free repair or refill.</small></details>`}</section>`;
}
