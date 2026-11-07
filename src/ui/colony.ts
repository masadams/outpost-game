import { MANIFESTS, type ManifestId } from '../sim/manifests';
import { RESOURCES, type Resource } from '../sim/resources';
import type { Product } from '../sim/colonyConfig';
import { POLICY_FIELDS, type PolicyField } from '../sim/colonyPolicy';
import { SCHEDULE_PRODUCTS, type ScheduleProduct } from '../sim/scheduling';
import { BUILD_TYPES, PRODUCTS, type BuildType } from '../sim/colonyConfig';
import type { ColonyAction } from '../sim/colony';

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
