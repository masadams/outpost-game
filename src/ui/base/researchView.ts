import { equipmentError } from '../../sim/equipment';
import { FINDS, findStudied, type FindId } from '../../sim/finds';
import { TECHNOLOGIES, UPGRADES } from '../../sim/progressionConfig';
import { researchError } from '../../sim/research';
import type { WorldState } from '../../sim/world';

export interface ResearchRow {
  id: FindId;
  find: string;
  /** What this row is about, in a short line. */
  line: string;
  /** 0 to 1 while research is running, otherwise null. */
  progress: number | null;
  action: { kind: 'research' | 'fit'; label: string; reason: string | null; tech: string; upgrade: string | null } | null;
}

const HINT: Record<FindId, string> = {
  storm: 'Pick up a piece of the storm and analyse it.',
  buoy: 'Fly to the Frost survey buoy and survey it.',
  crystal: 'Find the crystal on Nacre, bring it home and study it.',
  derelict: 'Fly to the Copper derelict and salvage it.',
  retrofit: 'Research Applied materials and Bulk logistics first.',
  bulwark: 'Survive the second storm.',
  core: 'Find the core sample on Cinder, bring it home and study it.',
};

const costText = (cost: Partial<Record<string, number>>): string =>
  Object.entries(cost).filter(([, n]) => (n ?? 0) > 0).map(([k, n]) => `${n} ${k}`).join(', ');

/** Research and fabrication tied to what the player has found. Null until a Research lab could matter. */
export function researchView(w: WorldState): ResearchRow[] | null {
  const root = w.rootWorld ?? w;
  if (!FINDS.some(f => findStudied(root, f.id))) return null;
  const hasLab = root.colony.buildings.some(b => b.kind === 'researchLab');
  return FINDS.map(f => {
    const tech = TECHNOLOGIES[f.tech];
    const part = f.upgrade ? UPGRADES[f.upgrade] : null;
    const base = { id: f.id, find: f.label };
    if (!findStudied(root, f.id)) return { ...base, line: HINT[f.id], progress: null, action: null };
    const queued = root.colony.research.queue.find(p => p.tech === f.tech);
    if (queued) {
      const why = hasLab ? null : 'Needs a Research lab';
      return { ...base, line: `Researching ${tech.label}…${why ? ` ${why}.` : ''}`, progress: queued.progress / tech.seconds, action: null };
    }
    if (!root.colony.research.completed.includes(f.tech)) {
      const reason = !hasLab ? 'Build a Research lab first.' : researchError(root, f.tech);
      return {
        ...base,
        line: `${tech.label}: costs ${costText(tech.cost)}.`,
        progress: null,
        action: { kind: 'research', label: 'Start research', reason, tech: f.tech, upgrade: f.upgrade ?? null },
      };
    }
    if (!f.upgrade || !part) {
      return { ...base, line: 'Done. Upgrade any building in place from Base.', progress: null, action: null };
    }
    if (root.ship.equipment.includes(f.upgrade)) {
      return { ...base, line: `${part.label} fitted: ${part.benefit}.`, progress: null, action: null };
    }
    return {
      ...base,
      line: `${part.label}: ${part.benefit}. Costs ${costText(part.cost)}.`,
      progress: null,
      action: { kind: 'fit', label: 'Fabricate and fit', reason: equipmentError(root, f.upgrade, 'install'), tech: f.tech, upgrade: f.upgrade },
    };
  });
}
