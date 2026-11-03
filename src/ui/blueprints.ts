import { HABITATS, isHabitat } from '../sim/habitatConfig';
import { SHIELDS } from '../sim/shieldConfig';
import { BLUEPRINTS, BUILD_TYPES, PRODUCTS, type BuildType } from '../sim/colonyConfig';
import { availableProduct } from '../sim/colonyPolicy';
import { isShield } from '../sim/shieldConfig';
import type { WorldState } from '../sim/world';
export const GROUPS: Array<[string, BuildType[]]> = [
 ['Power & storage',['solar','battery','storage']], ['Industry & research',['miningRig','refinery','fuelProcessor','researchLab']],
 ['Crew & service',['service','habitatSmall','habitatLarge']], ['Defence',['laser','flak','missile','shieldSmall','shieldLarge']],
];
export type BuildCategory='all'|'power'|'industry'|'crew'|'defence';
const CATEGORY_IDS:BuildCategory[]=['power','industry','crew','defence'];
export const categoryFor=(kind:BuildType):BuildCategory=>CATEGORY_IDS[GROUPS.findIndex(([,list])=>list.includes(kind))];
export function blueprintPalette(w: WorldState, disabled: string,category:BuildCategory='all'): string {
 return `<div class="build-palette">${GROUPS.filter((_,i)=>category==='all'||CATEGORY_IDS[i]===category).map(([label,kinds])=>`<fieldset><legend>${label}</legend>${kinds.map(kind=>{
  const b=BLUEPRINTS[kind], index=BUILD_TYPES.indexOf(kind);
  const reason=isShield(kind)&&!w.colony.research.completed.includes('combat')?'Requires Combat engineering':PRODUCTS.some(p=>availableProduct(w.colony,p)+1e-9<(b.cost[p]??0))?'Needs unreserved materials':'Materials available · check footprint';
  return `<button ${disabled} class="${kind===w.colony.selected?'selected':''}" data-select="${kind}" aria-pressed="${kind===w.colony.selected}">${index<9?`${index+1}. `:''}${b.label}<small>${Object.entries(b.cost).map(([p,q])=>`${q} ${p}`).join(' · ')}</small><small>${reason}</small></button>`;
 }).join('')}</fieldset>`).join('')}</div>`;
}

export function blueprintFootprint(kind:BuildType):string {
 if(isHabitat(kind)){const h=HABITATS[kind];return `${h.halfSpan*2} m coverage · two 2 m footings · ${h.power} kW + finite oxygen`;}
 if(isShield(kind)){const s=SHIELDS[kind];return `${s.radius} m shield radius · ${BLUEPRINTS[kind].halfWidth*2} m base · ${s.upkeep} kW upkeep + recharge`;}
 return `${BLUEPRINTS[kind].halfWidth*2} m footing${kind==='miningRig'?' · 6 kW · whole footing on a finite seam':''}`;
}
