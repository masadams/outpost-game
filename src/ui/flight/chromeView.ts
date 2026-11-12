import { bodyKnown } from '../../sim/explorationConfig';
import { featureVisible } from '../../preferences/features';
import { flightRegion, REGION_LABELS, type FlightRegion } from '../../sim/flightRegion';
import { OBJECTIVES, objectiveCue, objectiveProgress, type ObjectiveId } from '../../sim/objectives';
import { cargoMass } from '../../sim/shipMass';
import { RESOURCES } from '../../sim/resources';
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
  if (id === 'return') return returnLine(w);
  return '';
}

/** What to do next to get a rig working on Nacre, one step at a time. */
function moonWorkLine(w: WorldState): string {
  if (!bodyKnown(w.exploration, 'moon')) return 'The Observatory is looking at the moon.';
  const moon = w.outposts.moon;
  const onMoon = w.siteBody === 'moon';
  const rig = moon.colony.buildings.find(b => b.kind === 'miningRig');
  const crystal = w.exploration.crystal === 'lying' ? ' A blue crystal glows about 240 m east of the pad.' : '';
  if (rig) {
    if (rig.status === 'running') return `The rig is digging. Stay on Nacre, on foot, until ore comes up.${crystal}`;
    if (rig.status === 'no deposit') return 'The rig is not on an ore seam. Take it down and build it on a marked seam.';
    const powered = moon.colony.buildings.some(b => b.kind === 'solar');
    if (!powered) return 'The rig has no power. Build the solar array from the kit beside it.';
    return `The rig is waiting for power. It runs when the sun is up or the battery is charged.${crystal}`;
  }
  const aboard = w.ship.freight.alloy + w.ship.freight.wire + w.ship.freight.components > 0;
  const kitDown = moon.colony.products.alloy + moon.colony.products.wire + moon.colony.products.components > 0;
  if (onMoon && aboard) return 'Land on the Nacre pad and press E to unload the rig kit.';
  if (onMoon && kitDown) return `Step out (F) and build the mining rig on a marked ore seam. B opens the blueprints.${crystal}`;
  if (aboard) return 'Rig kit aboard. Fly to Nacre and land on its pad.';
  if (onMoon) return `A rig kit is needed to mine here. Load one at home: Ship panel, Load rig kit.${crystal}`;
  return 'To mine Nacre, load a rig kit on the home pad (Ship panel, Load rig kit), then fly there.';
}

/** What to do next to bring Nacre's ore home. */
function returnLine(w: WorldState): string {
  const root = w.rootWorld ?? w;
  const cargo = RESOURCES.reduce((sum, r) => sum + w.ship.cargo[r], 0);
  const waiting = RESOURCES.reduce((sum, r) => sum + root.outposts.moon.depot[r], 0);
  const onMoon = w.siteBody === 'moon';
  if (cargo > 0) {
    return onMoon
      ? `${cargo.toFixed(0)} kg in the hold. Fly home, land on the pad and press E.`
      : `${cargo.toFixed(0)} kg of Nacre ore in the hold. Land on the home pad and press E.`;
  }
  if (waiting < 1) return 'The Nacre depot is empty. Let the rig dig, then come back for the ore.';
  if (!onMoon) return `${waiting.toFixed(0)} kg of ore waits on Nacre. Land on its pad to load it.`;
  if (w.playerMode !== 'ship') return `${waiting.toFixed(0)} kg in the depot here. Board the lander on the pad (F), then Ship panel, Load ore.`;
  return `${waiting.toFixed(0)} kg in the depot here. On the pad, open the Ship panel and press Load ore, then fly home.`;
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

/** The lines the unit prints as it wakes. */
const BOOT_LINES: readonly string[] = [
  'SEED UNIT 7 · BACK ONLINE',
  'LAST ENTRY · 412 YEARS AGO',
  'MEMORY ARCHIVE · 6% READABLE',
  'STANDING ORDER · MAKE THIS SYSTEM READY FOR THOSE WHO FOLLOW',
  'ONE LANDER · ONE PRINTED PILOT',
];
/** How long the boot log stays up at the start of a new game (game seconds). */
const BOOT_SECONDS = 16;

/** The boot log, for the first moments of a new story game; null the rest of the time. */
export function bootLog(source: WorldState): readonly string[] | null {
  const w = source.rootWorld ?? source;
  if (!w.system.sun || w.system.time > BOOT_SECONDS) return null;
  if (w.unloaded > 0 || w.colony.buildings.some(b => b.kind !== 'headquarters')) return null;
  const lives = w.exploration.story?.lives ?? 0;
  if (lives > 0) {
    return [
      `SEED UNIT 7 · COPY ${lives + 1} · ARRIVING`,
      `SYSTEMS MADE READY · ${lives}`,
      'MEMORY ARCHIVE · INTACT',
      'NO ORDER ON FILE THIS TIME',
      'ONE LANDER · ONE PRINTED PILOT',
    ];
  }
  return BOOT_LINES;
}
