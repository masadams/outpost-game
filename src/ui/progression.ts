import { TECH_IDS, UPGRADE_IDS, type PartSlot, type TechId, type UpgradeId, type ProgressionAction } from '../sim/progressionConfig';
import type { WorldState } from '../sim/world';
import { techTree, type ResearchFilter } from './techTree';
import { shipFitting } from './shipFitting';
export type { ResearchFilter } from './techTree';
export function progressionPanel(w:WorldState,paused:boolean,slot:PartSlot,filter:ResearchFilter,tech:TechId,part:UpgradeId):string {
 return techTree(w,paused,tech,filter)+shipFitting(w,paused,slot,part);
}
export function progressionAction(button: HTMLElement): ProgressionAction | null {
  const d = button.dataset;
  if (d.researchStart && TECH_IDS.includes(d.researchStart as TechId)) return { type: 'researchStart', tech: d.researchStart as TechId };
  if (d.researchTech && TECH_IDS.includes(d.researchTech as TechId) && (d.researchControl === 'pause' || d.researchControl === 'cancel')) return { type: 'researchControl', tech: d.researchTech as TechId, operation: d.researchControl };
  if (d.equipment && UPGRADE_IDS.includes(d.equipment as UpgradeId) && (d.equipmentOperation === 'install' || d.equipmentOperation === 'remove')) return { type: 'equipment', upgrade: d.equipment as UpgradeId, operation: d.equipmentOperation };
  return null;
}
