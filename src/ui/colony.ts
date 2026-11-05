import { colonyPlanet } from '../sim/localWorld';
import { MANIFESTS, type ManifestId } from '../sim/manifests';
import { RESOURCES, type Resource } from '../sim/resources';
import type { Product } from '../sim/colonyConfig';
import { habitatDetails } from './habitats';
import { geologyPanel, rigDetails } from './geology';
import { schedulingPanel } from './scheduling';
import { policyPanel } from './colonyPolicy';
import { POLICY_FIELDS, type PolicyField } from '../sim/colonyPolicy';
import { SCHEDULE_PRODUCTS, type ScheduleProduct } from '../sim/scheduling';
import { buildingHealth } from '../sim/buildingHealth';
import { isTurret, WEAPONS } from '../sim/defenceConfig';
import { BLUEPRINTS, BUILD_TYPES, PRODUCTS, type BuildType } from '../sim/colonyConfig';
import { energyCapacity, oreCapacity, nearbyBuilding, recipeFor, type ColonyAction } from '../sim/colony';
import { inventoryMass } from '../sim/resources';
import type { WorldState } from '../sim/world';

/** Nearby facility controls and local stocks. Building itself lives in the build bar. */
export function colonyPanel(world: WorldState, paused: boolean): string {
  const colony = world.colony, disabled = paused || world.playerMode !== 'astronaut' ? 'disabled' : '';
  const near = nearbyBuilding(world);
  return `<label>${colonyPlanet(world).label.toUpperCase()} · ${colony.buildings.length} BUILDINGS</label>
    ${near ? `<div class="machine" data-hull="${buildingHealth(near).toFixed(1)}" data-aim="${(near.turret?.aim ?? 0).toFixed(3)}"><label>${BLUEPRINTS[near.kind].label}</label><p>Hull ${buildingHealth(near).toFixed(0)}% · ${near.status}${recipeFor(near) ? ` · ${recipeFor(near)!.label} · ${near.progress.toFixed(1)} s` : ''}</p>
      ${near.kind === 'storage' || near.kind === 'battery' ? `<p>${buildingHealth(near) > 0 ? 'Passive capacity · available' : 'Capacity lost · repair to restore'}</p>` : `<button ${disabled} data-colony="toggleMachine">${near.enabled ? 'Disable' : 'Enable'} nearby${near.kind === 'service' || isTurret(near.kind) ? '' : ' [E]'}</button>`}
      ${isTurret(near.kind) ? `<p>${WEAPONS[near.kind].range} m · ${WEAPONS[near.kind].energy} kJ/shot${WEAPONS[near.kind].alloy ? ` · ${WEAPONS[near.kind].alloy} alloy${WEAPONS[near.kind].components ? ` + ${WEAPONS[near.kind].components} components` : ''}` : ''}</p><button ${disabled} data-colony="controlTurret">${world.defence.controlled === near.id ? 'Release turret' : 'Control turret'} [E]</button><button ${disabled} data-colony="toggleAuto">Auto defence [G]: ${near.turret?.automatic ? 'on' : 'off'}</button>` : ''}
      <button ${disabled || buildingHealth(near) >= 100 ? 'disabled' : ''} data-colony="repairBuilding">Repair nearby [U] · 1 alloy / 10 hull</button>
      ${near.kind === 'service' ? '<p>E: suit service / repair / refuel</p>' : ''}
      ${rigDetails(world, near)}${habitatDetails(near)}
      ${near.kind === 'refinery' ? `<button ${disabled} data-colony="cycleRecipe">Next refinery recipe [V]</button>` : ''}
      ${schedulingPanel(near, disabled || buildingHealth(near) <= 0 ? 'disabled' : '')}</div>` : ''}
    ${policyPanel(world, paused)}
    ${geologyPanel(world)}
    <details data-preserve-open><summary>Local power and stocks</summary>    <div class="resource"><span>Supply / demand</span><span>${colony.generation.toFixed(0)} / ${colony.demand.toFixed(0)} kW</span></div>
    <div class="resource"><span>Stored energy</span><span>${colony.energy.toFixed(1)} / ${energyCapacity(colony)} kJ</span></div>
    <div class="resource"><span>Ore storage</span><span>${inventoryMass(world.depot).toFixed(0)} / ${oreCapacity(colony)} kg</span></div>
    <div class="product-grid">${PRODUCTS.map(p => `<span>${p}<b>${colony.products[p].toFixed(1)}</b></span>`).join('')}</div></details>
    <p class="checkpoint">K: save checkpoint · L: load<br><small>Manual local save · R keeps checkpoint</small></p>`;
}
export function actionFromButton(button: HTMLElement): ColonyAction | null {
  const body=button.dataset.body==='home'||button.dataset.body==='moon'?button.dataset.body:undefined;
  if(button.dataset.crew&&['walk','build','stop'].includes(button.dataset.crew))return {type:'crewOrder',operation:button.dataset.crew as 'build'|'stop',body};
  if(button.dataset.queueSite!==undefined&&button.dataset.kind&&BUILD_TYPES.includes(button.dataset.kind as BuildType))return {type:'queueBuild',kind:button.dataset.kind as BuildType,angle:Number(button.dataset.queueSite),body};
  if(button.dataset.workOrder&&['pause','cancel'].includes(button.dataset.workOperation??''))return {type:'queueControl',id:Number(button.dataset.workOrder),operation:button.dataset.workOperation as 'pause'|'cancel',body};
  if (button.dataset.manifest && Object.hasOwn(MANIFESTS, button.dataset.manifest)) return { type: 'loadManifest', manifest: button.dataset.manifest as ManifestId };
  if (button.dataset.oreLoad && RESOURCES.includes(button.dataset.oreLoad as Resource)) return { type: 'loadOre', resource: button.dataset.oreLoad as Resource };
  if (button.dataset.freight && PRODUCTS.includes(button.dataset.freight as Product)) return { type: 'freight', product: button.dataset.freight as Product, delta: Number(button.dataset.delta) };
  const { colony, select, shift, target, delta, policy, direction } = button.dataset;
  if (policy && POLICY_FIELDS.includes(policy as PolicyField) && (direction === '-1' || direction === '1')) return { type: 'adjustPolicy', field: policy as PolicyField, direction: Number(direction) as -1 | 1 };
  if (target && SCHEDULE_PRODUCTS.includes(target as ScheduleProduct) && (delta === '-5' || delta === '5')) return { type: 'adjustTarget', product: target as ScheduleProduct, delta: Number(delta) as -5 | 5 };
  if (select && BUILD_TYPES.includes(select as BuildType)) return { type: 'select', kind: select as BuildType };
  if (shift === '-32' || shift === '32') return { type: 'shift', delta: Number(shift) };
  if (colony && ['toggleTow', 'installTowRig', 'toggleSchedule', 'toggleBuild', 'place', 'demolish', 'toggleMachine', 'cycleRecipe', 'startWave', 'controlTurret', 'releaseTurret', 'toggleAuto', 'repairBuilding', 'startEncounter', 'cycleWeapon', 'recoverShip'].includes(colony)) return { type: colony } as ColonyAction;
  return null;
}
