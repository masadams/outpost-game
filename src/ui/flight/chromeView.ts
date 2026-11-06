import { featureVisible } from '../../preferences/features';
import { flightRegion, REGION_LABELS, type FlightRegion } from '../../sim/flightRegion';
import { OBJECTIVES, objectiveProgress, type ObjectiveId } from '../../sim/objectives';
import { cargoMass } from '../../sim/shipMass';
import type { WorldState } from '../../sim/world';
import { stormView } from './stormView';
import { coach, DEFAULT_COACH_KEYS, type CoachKeys } from './coach';

type Objective = typeof OBJECTIVES[number];

/** Milestones shown to the player; the focus set keeps the first sortie only. */
const FOCUS_OBJECTIVES: readonly ObjectiveId[] = ['delivery', 'industry', 'buoy', 'sky', 'storm', 'analysis'];

export function shownObjectives(w?: WorldState): ReadonlyArray<Objective> {
  const all = featureVisible('catalogue') ? OBJECTIVES : OBJECTIVES.filter(o => FOCUS_OBJECTIVES.includes(o.id));
  const sunOn = (w?.rootWorld ?? w)?.system.sun ?? true;
  return sunOn ? all : all.filter(o => o.id !== 'buoy');
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

function detailFor(w: WorldState, id: ObjectiveId, keys: CoachKeys): string {
  if (id === 'delivery') {
    const step = coach(w, keys);
    if (step) return step.text;
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
  if (id === 'buoy') {
    return 'Open the Map, pick the Frost survey buoy, fly there and survey it.';
  }
  if (id === 'sky') {
    const lab = w.colony.buildings.find(b => b.kind === 'observatory');
    if (!lab) return 'Build an Observatory (the buoy data unlocked it), then give it power.';
    if (lab.status === 'running') return 'Scanning. Leave it powered.';
    return 'The Observatory needs power. Build a solar array.';
  }
  if (id === 'storm') {
    const view = stormView(w);
    if (view) return view.detail;
    if (!w.colony.buildings.some(b => b.kind === 'observatory')) return 'Build the Observatory to see what is coming.';
    return 'Keep scanning.';
  }
  if (id === 'analysis') {
    const storm = w.storm;
    if (storm.analysed) return 'Done. Your buildings now take less damage from blasts.';
    if (storm.held > 0) return 'Open Base and analyse a piece of the storm.';
    if (storm.samples.length > 0) return 'Pieces of the storm are on the ground. Walk over one.';
    if (storm.phase === 'over') return 'Nothing left to collect.';
    return 'Get through the storm first.';
  }
  return '';
}

/** The objective card follows the tracked goal, or the next unfinished one. */
export function objectiveCard(
  w: WorldState,
  tracked: ObjectiveId | 'auto' = 'auto',
  keys: CoachKeys = DEFAULT_COACH_KEYS,
): ObjectiveCardView {
  const root = w.rootWorld ?? w;
  const shown = shownObjectives(root);
  const done = root.objectives.completed.filter(id => shown.some(o => o.id === id));
  const next = tracked === 'auto' ? shown.find(o => !done.includes(o.id)) : shown.find(o => o.id === tracked);
  const count = `${done.length}/${shown.length}`;
  if (!next) return { count, title: 'All goals complete', detail: 'Keep exploring.', fraction: 1, complete: true };
  const progress = objectiveProgress(w, next.id);
  const complete = done.includes(next.id);
  return {
    count,
    title: next.label,
    detail: complete ? 'Done.' : detailFor(w.rootWorld ? w : root, next.id, keys) || next.hint,
    fraction: complete ? 1 : Math.max(0, Math.min(1, progress.value / progress.target)),
    complete,
  };
}

export function regionView(w: WorldState): RegionView {
  const position = w.playerMode === 'astronaut' ? w.astronaut.position : w.ship.position;
  const key = flightRegion(position, w.system);
  return { key, label: REGION_LABELS[key] };
}
