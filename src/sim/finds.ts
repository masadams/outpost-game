import type { TechId, UpgradeId } from './progressionConfig';
import type { WorldState } from './world';

export type FindId = 'storm' | 'buoy' | 'crystal' | 'derelict' | 'retrofit' | 'bulwark' | 'core';

export interface Find {
  id: FindId;
  label: string;
  /** What studying it teaches. */
  tech: TechId;
  /** The part you can fabricate once the project is done. */
  /** The part you can fabricate, if the find gives one. */
  upgrade?: UpgradeId;
}

/** Things worth studying. Each opens one research project and one part to fabricate. */
export const FINDS: readonly Find[] = [
  { id: 'storm', label: 'Pieces of the storm', tech: 'materials', upgrade: 'armour' },
  { id: 'buoy', label: 'Survey buoy data', tech: 'extraction', upgrade: 'mining' },
  { id: 'derelict', label: 'Derelict data', tech: 'propulsion', upgrade: 'engine' },
  { id: 'retrofit', label: 'Retrofit designs', tech: 'infrastructure' },
  { id: 'bulwark', label: 'The second storm', tech: 'combat' },
  { id: 'core', label: 'Cinder core sample', tech: 'precision', upgrade: 'deepMining' },
  { id: 'crystal', label: 'Nacre crystal', tech: 'logistics', upgrade: 'bulkHold' },
];

/** Whether the find has been picked up and studied. */
export function findStudied(w: WorldState, id: FindId): boolean {
  const root = w.rootWorld ?? w;
  if (id === 'storm') return root.storm.analysed;
  if (id === 'buoy') return root.exploration.surveyed.includes('frost');
  // Not a thing you pick up: it opens once the two research steps behind it are done.
  // Surviving the bigger storm teaches how to turn blasts aside: the shield research opens.
  if (id === 'bulwark') return root.storm.wave === 2 && root.storm.phase === 'over';
  if (id === 'retrofit') return root.colony.research.completed.includes('materials') && root.colony.research.completed.includes('logistics');
  if (id === 'derelict') return root.exploration.surveyed.includes('copper');
  if (id === 'core') return root.exploration.core === 'studied';
  return root.exploration.crystal === 'studied';
}

export const studiedFinds = (w: WorldState): Find[] => FINDS.filter(f => findStudied(w, f.id));

/** Projects the Research lab may work on in a day-cycle game: only what a find has opened. */
export function openTechs(w: WorldState): TechId[] {
  return studiedFinds(w).map(f => f.tech);
}
