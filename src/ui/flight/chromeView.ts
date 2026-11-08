import { bodyKnown } from '../../sim/explorationConfig';
import { featureVisible } from '../../preferences/features';
import { flightRegion, REGION_LABELS, type FlightRegion } from '../../sim/flightRegion';
import { OBJECTIVES, objectiveCue, objectiveProgress, type ObjectiveId } from '../../sim/objectives';
import { PRODUCTS } from '../../sim/colonyConfig';
import { cargoMass } from '../../sim/shipMass';
import type { WorldState } from '../../sim/world';
import { stormView } from './stormView';
import { coach, DEFAULT_COACH_KEYS, type CoachKeys } from './coach';

type Objective = typeof OBJECTIVES[number];

/** Milestones shown to the player; the focus set keeps the first sortie only. */
const FOCUS_OBJECTIVES: readonly ObjectiveId[] = ['delivery', 'industry', 'buoy', 'sky', 'storm', 'analysis', 'storm2', 'moonWork', 'return'];

/** Whether a milestone has come up. The all-features switch shows every one, for testing. */
export const cued = (w: WorldState, id: ObjectiveId): boolean => featureVisible('catalogue') || objectiveCue(w, id);

export function shownObjectives(w?: WorldState): ReadonlyArray<Objective> {
  const all = featureVisible('catalogue') ? OBJECTIVES : OBJECTIVES.filter(o => FOCUS_OBJECTIVES.includes(o.id));
  const sunOn = (w?.rootWorld ?? w)?.system.sun ?? true;
  return sunOn ? all : all.filter(o => o.id !== 'buoy');
}

export interface ObjectiveCardView {
  /** False while nothing has come up: the card stays out of the way. */
  visible: boolean;
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
    if (kinds.has('refinery')) return 'The refinery has ore. It needs power to run.';
    return 'Ore is piling up with nothing to process it.';
  }
  if (id === 'buoy') {
    return 'A survey buoy is marked on the Map: Frost.';
  }
  if (id === 'sky') {
    const lab = w.colony.buildings.find(b => b.kind === 'observatory');
    if (!lab) return 'The buoy data describes an instrument, an Observatory.';
    if (lab.status === 'running') return 'Scanning. Leave it powered.';
    if (lab.linked === false) return 'The Observatory is out of reach of the base power.';
    return 'The Observatory has no power.';
  }
  if (id === 'storm') {
    const view = stormView(w);
    if (view) return view.detail;
    if (!w.colony.buildings.some(b => b.kind === 'observatory')) return 'Something is out there.';
    return 'Keep scanning.';
  }
  if (id === 'analysis') {
    const storm = w.storm;
    if (storm.analysed) return 'Done. Your buildings now take less damage from blasts.';
    if (storm.held > 0) return 'You are carrying a piece of the storm.';
    if (storm.samples.length > 0) return 'Pieces of the storm are lying on the ground.';
    if (storm.phase === 'over') return 'Nothing left to collect.';
    return 'Get through the storm first.';
  }
  if (id === 'storm2') {
    const view = stormView(w);
    if (view) return view.detail;
    if (w.storm.wave === 1) return 'A bigger one is on its way.';
    return 'Another storm is forming.';
  }
  if (id === 'moonWork') return moonWorkLine(w);
  if (id === 'return') {
    return w.ship.cargo.iron + w.ship.cargo.copper + w.ship.cargo.ice + w.ship.cargo.silicon + w.ship.cargo.rareMetals > 0
      ? 'Nacre ore in the hold. It is worth nothing until it is home.'
      : 'The hold is empty.';
  }
  return '';
}

function moonWorkLine(w: WorldState): string {
  if (!bodyKnown(w.exploration, 'moon')) return 'The Observatory is looking at the moon.';
  const kitBuilt = w.outposts.moon.colony.buildings.some(b => b.kind === 'miningRig');
  const crystal = w.exploration.crystal === 'lying' ? ' A blue crystal glows about 240 m east of the pad.' : '';
  if (kitBuilt) return `The rig is on Nacre.${crystal}`;
  if (w.siteBody === 'moon') return `Ore seams are marked on the surface.${crystal}`;
  return 'Nacre is on the Map. Its surface has ore seams.';
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
  const open = (o: Objective) => !done.includes(o.id) && cued(root, o.id);
  const next = tracked === 'auto' ? shown.find(open) : shown.find(o => o.id === tracked && open(o));
  const count = `Journal · ${done.length}`;
  if (!next) return { visible: false, count, title: '', detail: '', fraction: 0, complete: false };
  const progress = objectiveProgress(w, next.id);
  return {
    visible: true,
    count,
    title: next.label,
    detail: detailFor(w.rootWorld ? w : root, next.id, keys) || next.hint,
    fraction: Math.max(0, Math.min(1, progress.value / progress.target)),
    complete: false,
  };
}

export function regionView(w: WorldState): RegionView {
  const position = w.playerMode === 'astronaut' ? w.astronaut.position : w.ship.position;
  const key = flightRegion(position, w.system);
  return { key, label: REGION_LABELS[key] };
}
