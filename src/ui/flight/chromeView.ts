import { featureVisible } from '../../preferences/features';
import { flightRegion, REGION_LABELS, type FlightRegion } from '../../sim/flightRegion';
import { OBJECTIVES, objectiveProgress, type ObjectiveId } from '../../sim/objectives';
import { cargoMass } from '../../sim/shipMass';
import type { WorldState } from '../../sim/world';

type Objective = typeof OBJECTIVES[number];

/** Milestones shown to the player; the focus set keeps the first sortie only. */
const FOCUS_OBJECTIVES: readonly ObjectiveId[] = ['delivery', 'industry'];

export function shownObjectives(): ReadonlyArray<Objective> {
  return featureVisible('catalogue') ? OBJECTIVES : OBJECTIVES.filter(o => FOCUS_OBJECTIVES.includes(o.id));
}

export interface ObjectiveCardView {
  count: string;
  title: string;
  detail: string;
  fraction: number;
  complete: boolean;
}

export interface RegionView {
  key: FlightRegion;
  label: string;
}

function detailFor(w: WorldState, id: ObjectiveId): string {
  if (id === 'delivery') {
    const cargo = cargoMass(w.ship);
    if (cargo <= 0) return 'Mine a rock, then hold C to pull the fragments in.';
    if (w.ship.state === 'landed') return `${cargo.toFixed(0)} kg in the hold. Press E to unload.`;
    return `${cargo.toFixed(0)} kg in the hold. Land on the green pad.`;
  }
  if (id === 'industry') {
    const kinds = new Set(w.colony.buildings.map(b => b.kind));
    const missing = [!kinds.has('solar') && 'a solar array', !kinds.has('refinery') && 'a refinery'].filter(Boolean);
    if (missing.length) return `Build ${missing.join(' and ')}.`;
    return 'Give the refinery ore and power to start it.';
  }
  return '';
}

/** The objective card follows the tracked goal, or the next unfinished one. */
export function objectiveCard(w: WorldState, tracked: ObjectiveId | 'auto' = 'auto'): ObjectiveCardView {
  const root = w.rootWorld ?? w;
  const shown = shownObjectives();
  const done = root.objectives.completed.filter(id => shown.some(o => o.id === id));
  const next = tracked === 'auto' ? shown.find(o => !done.includes(o.id)) : shown.find(o => o.id === tracked);
  const count = `${done.length}/${shown.length}`;
  if (!next) return { count, title: 'All goals complete', detail: 'Keep exploring.', fraction: 1, complete: true };
  const progress = objectiveProgress(w, next.id);
  const complete = done.includes(next.id);
  return {
    count,
    title: next.label,
    detail: complete ? 'Done.' : detailFor(root, next.id) || next.hint,
    fraction: complete ? 1 : Math.max(0, Math.min(1, progress.value / progress.target)),
    complete,
  };
}

export function regionView(w: WorldState): RegionView {
  const position = w.playerMode === 'astronaut' ? w.astronaut.position : w.ship.position;
  const key = flightRegion(position, w.system);
  return { key, label: REGION_LABELS[key] };
}
