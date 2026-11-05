import { featureVisible, FOCUS_BLUEPRINTS } from '../preferences/features';
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
/** Blueprint groups the player can see; the focus set shows one short list. */
export function visibleGroups(category: BuildCategory = 'all'): Array<[string, BuildType[]]> {
  if (!featureVisible('catalogue')) return [['Buildings', [...FOCUS_BLUEPRINTS]]];
  return GROUPS.filter((_, i) => category === 'all' || CATEGORY_IDS[i] === category);
}

/** One short line on what is still missing, or that the building can be afforded. */
function shortfall(w: WorldState, kind: BuildType): string {
  const missing = PRODUCTS.flatMap(p => {
    const need = BLUEPRINTS[kind].cost[p] ?? 0;
    const have = availableProduct(w.colony, p);
    return have + 1e-9 < need ? [`${Number((need - have).toFixed(1))} more ${p}`] : [];
  });
  return missing.length ? `Needs ${missing.join(', ')}` : 'You can afford this';
}

export function blueprintPalette(w: WorldState, disabled: string,category:BuildCategory='all'): string {
 return `<div class="build-palette">${visibleGroups(category).map(([label,kinds])=>`<fieldset><legend>${label}</legend>${kinds.map(kind=>{
  const b=BLUEPRINTS[kind], index=BUILD_TYPES.indexOf(kind);
  const reason=isShield(kind)&&!w.colony.research.completed.includes('combat')?'Requires Combat engineering':shortfall(w,kind);
  return `<button ${disabled} class="${kind===w.colony.selected?'selected':''}" data-select="${kind}" aria-pressed="${kind===w.colony.selected}">${index<9?`${index+1}. `:''}${b.label}<small>${Object.entries(b.cost).map(([p,q])=>`${q} ${p}`).join(' · ')}</small><small>${reason}</small></button>`;
 }).join('')}</fieldset>`).join('')}</div>`;
}

export function blueprintFootprint(kind:BuildType):string {
 if(isHabitat(kind)){const h=HABITATS[kind];return `${h.halfSpan*2} m coverage · two 2 m footings · ${h.power} kW + finite oxygen`;}
 if(isShield(kind)){const s=SHIELDS[kind];return `${s.radius} m shield radius · ${BLUEPRINTS[kind].halfWidth*2} m base · ${s.upkeep} kW upkeep + recharge`;}
 return `${BLUEPRINTS[kind].halfWidth*2} m footing${kind==='miningRig'?' · 6 kW · whole footing on a finite seam':''}`;
}
