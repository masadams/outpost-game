import type { TechId } from './progressionConfig';
import type { WorldState } from './world';

/** Storms the base has lived through so far. */
export function stormsSurvived(w: WorldState): number {
  return w.storm.phase === 'over' ? w.storm.wave : Math.max(0, w.storm.wave - 1);
}

const allColonies = (w: WorldState) => [w.colony, ...Object.values(w.outposts).map(o => o.colony)];
const hasBuilt = (w: WorldState, kind: string): boolean => allColonies(w).some(c => c.buildings.some(b => b.kind === kind));

interface Gate {
  met: (w: WorldState) => boolean;
  /** Shown to the player while the gate is closed. */
  text: string;
}

/** Story beats that open the deeper research, on top of its prerequisites. Everything else opens by prerequisites alone. */
const GATES: Partial<Record<TechId, Gate>> = {
  ballistics: { met: w => stormsSurvived(w) >= 1, text: 'Not yet: live through a storm first.' },
  fieldRepair: { met: w => stormsSurvived(w) >= 1, text: 'Not yet: live through a storm first.' },
  geoscience: { met: w => hasBuilt(w, 'miningRig'), text: 'Not yet: run a mining rig first.' },
  massDrivers: { met: w => Object.values(w.outposts).some(o => o.colony.buildings.length > 0), text: 'Not yet: found a base on another world.' },
  surveyOptics: { met: w => hasBuilt(w, 'observatory'), text: 'Not yet: build an Observatory first.' },
  autonomy: { met: w => hasBuilt(w, 'researchLab'), text: 'Not yet: run a Research lab first.' },
  deepSignal: { met: w => stormsSurvived(w) >= 2 && hasBuilt(w, 'antenna'), text: 'Not yet: build an Antenna and live through two storms.' },
};

/** Why a technology is still closed to the story, or null. */
export function techStoryGate(w: WorldState, tech: TechId): string | null {
  const gate = GATES[tech];
  return gate && !gate.met(w) ? gate.text : null;
}
