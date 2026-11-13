import type { BuildType } from './colonyConfig';
import { oreCapacity, productCapacity } from './colony';
import { PRODUCTS } from './colonyConfig';
import { notify } from './messages';
import { DEEP } from './deepSpace';
import { inventoryMass } from './resources';
import { fuelCapacity } from './shipStats';
import { sunClock } from './sun';
import { WORLD } from './config';
import { nearestPlanet, type BodyId } from './celestial';
import type { WorldState } from './world';

/**
 * The story: you are a seed unit, woken after centuries with most of its memory unreadable. What it remembers
 * comes back as things happen. Some memories are also blueprints, which is how the early buildings arrive one
 * at a time, each with a reason. See docs/STORY.md.
 */
/** The parts of the Journal, in the order they are shown. */
export const CHAPTERS = [
  { id: 'waking', title: 'Waking' },
  { id: 'sky', title: 'The sky' },
  { id: 'others', title: 'The other units' },
  { id: 'signal', title: 'The signal' },
  { id: 'carrier', title: 'Long Patience' },
  { id: 'deep', title: 'Far out' },
] as const;
export type ChapterId = typeof CHAPTERS[number]['id'];

export interface Memory {
  id: string;
  title: string;
  /** What the unit writes down, in its own voice: a short log entry, first person, plain. */
  text: string;
  /** Which part of the Journal it is filed under. */
  chapter: ChapterId;
  /** What to do to find it, shown in the Journal while it is the next thing in its chapter. */
  lead?: string;
  /** The memory that has to come back before the lead is shown. None: shown from the start. */
  after?: string;
  /** The blueprint this memory is, if it is one. */
  blueprint?: BuildType;
  /** Whether what has happened brings it back. Checked every step until it does. */
  when: (w: WorldState) => boolean;
}

export interface StoryState {
  /** Ids of recovered memories, oldest first. */
  memories: string[];
  /** How many systems this unit has made ready before this one: set when a game begins after the colony ending. */
  lives?: number;
}

export const createStory = (): StoryState => ({ memories: [] });

const colonies = (w: WorldState) => [w.colony, ...Object.values(w.outposts).map(o => o.colony)];
const built = (w: WorldState, kind: BuildType): boolean => colonies(w).some(c => c.buildings.some(b => b.kind === kind));
const done = (w: WorldState, id: string): boolean => (w.objectives.completed as string[]).includes(id);
const surveyed = (w: WorldState, id: string): boolean => (w.exploration.surveyed as string[]).includes(id);
const night = (w: WorldState): boolean => !!w.system.sun && !sunClock(w.system, WORLD.padAngle).day;
/** Whether the lander has set down on that world. */
const landedOn = (w: WorldState, id: BodyId): boolean =>
  w.ship.state === 'landed' && nearestPlanet(w.ship.position, w.system).id === id;
const WORLD_MEMORIES = ['cinder', 'ember', 'glint', 'verdant', 'tide', 'murk'] as const;
/** Whether that place is a world with something to read on it. */
export const hasWorldMemory = (id: string): boolean => (WORLD_MEMORIES as readonly string[]).includes(id);
/** How far through the wait for the beacon's reply the game is, 0 to 1; 0 before a beacon is sent. */
const signalShare = (w: WorldState): number => {
  const signal = w.exploration.signal;
  if (!signal) return 0;
  if (signal.phase === 'heard') return 1;
  const wait = Math.max(1, signal.hearAt - signal.sentAt);
  return Math.min(1, Math.max(0, (w.system.time - signal.sentAt) / wait));
};
/** How long after the echo the second signal is picked out, with an antenna standing (game seconds). */
export const SECOND_SIGNAL_SECONDS = 900;
const depotShare = (w: WorldState): number => inventoryMass(w.depot) / oreCapacity(w.colony);
const fullestProduct = (w: WorldState): number => Math.max(...PRODUCTS.map(p => w.colony.products[p])) / productCapacity(w.colony);

export const MEMORIES: readonly Memory[] = [
  {
    id: 'boot', title: 'Back online',
    chapter: 'waking',
    text: 'Seed unit 7, running again. My clock says 412 years have passed since the last entry. Most of the archive will not read back; about six percent does. One order is intact: make this system ready for the people who are coming.',
    when: () => true,
  },
  {
    id: 'inherited', title: 'Second system',
    chapter: 'waking',
    text: 'I have done this before, in another system. That time the archive came through whole, the colony was founded and the ship went on. Same work, new star.',
    when: w => (w.exploration.story?.lives ?? 0) > 0,
  },
  {
    id: 'firstOre', title: 'Ore in the depot',
    chapter: 'waking',
    lead: 'Mine a rock and bring the ore home to the pad.',
    text: 'First ore in the depot. Handling it brought back a procedure I could not find an hour ago. The archive seems to answer to what I am doing, so I will keep working and see what else returns.',
    when: w => done(w, 'delivery'),
  },
  {
    id: 'firstMetal', title: 'First metal',
    chapter: 'waking',
    lead: 'Build a refinery and pour the first alloy.',
    after: 'firstOre',
    text: 'The refinery poured its first alloy. Nothing has been made here in four hundred years, and the whole process came back to me as soon as the furnace lit.',
    when: w => done(w, 'industry'),
  },
  {
    id: 'battery', title: 'Battery', blueprint: 'battery',
    chapter: 'waking',
    text: 'Solar power stops at dusk and the base stops with it. The battery design has come back: charge by day, run through the night.',
    when: w => done(w, 'industry') && (night(w) || w.unloaded >= 200),
  },
  {
    id: 'fuelProcessor', title: 'Fuel processor', blueprint: 'fuelProcessor',
    chapter: 'waking',
    text: 'The tanks are a little lower after every flight and nothing here refills them. Water and oxygen make fuel. I have the plant design again.',
    when: w => done(w, 'industry') && (w.ship.fuel < 0.6 * fuelCapacity(w.ship) || w.unloaded >= 150),
  },
  {
    id: 'storage', title: 'Storage', blueprint: 'storage',
    chapter: 'waking',
    text: 'The depot is filling faster than the refinery can clear it. The plans for a proper store have come back, with more room for ore and for finished materials.',
    when: w => done(w, 'industry') && (depotShare(w) >= 0.5 || fullestProduct(w) >= 0.6 || w.unloaded >= 300),
  },
  {
    id: 'miningRig', title: 'Mining rig', blueprint: 'miningRig',
    chapter: 'waking',
    text: 'So far every kilogram has come down in the lander\'s hold. There are seams in the ground near the base, and I remember the rig that works them.',
    when: w => done(w, 'industry') && w.unloaded >= 250,
  },
  {
    id: 'relay', title: 'Power relay', blueprint: 'relay',
    chapter: 'waking',
    text: 'The base has spread past what its wiring can feed. A relay pylon carries power to buildings farther out.',
    when: w => done(w, 'industry') && w.colony.buildings.length >= 5,
  },
  {
    id: 'condenser', title: 'Air condenser', blueprint: 'condenser',
    chapter: 'waking',
    text: 'The fuel plant uses more water than I can haul. Selene\'s air is thin, but there is water in it, and a condenser can draw it out.',
    // Later than the other early blueprints: after the first storm, once the fuel plant has been running a while.
    when: w => done(w, 'storm') && built(w, 'fuelProcessor'),
  },
  {
    id: 'buoy', title: 'The buoy',
    chapter: 'sky',
    lead: 'Something is transmitting from the Frost rocks. The Map shows where; fly out and survey it.',
    after: 'firstMetal',
    text: 'The buoy belongs to the people who built me. It is still transmitting its last instruction, on a loop: WATCH THE SKY. It gives no reason.',
    when: w => surveyed(w, 'frost'),
  },
  {
    id: 'sky', title: 'The Observatory',
    chapter: 'sky',
    lead: 'The buoy says to watch the sky. Build an Observatory and keep it powered.',
    after: 'buoy',
    text: 'The Observatory is running. Within the hour it had tracks on dozens of objects, and several of them are heading here.',
    when: w => done(w, 'sky'),
  },
  {
    id: 'storm', title: 'After the storm',
    chapter: 'sky',
    lead: 'Rocks are on their way. Get the base through the first storm.',
    after: 'sky',
    text: 'First storm survived. The archive index lists forty earlier ones, each logged by a unit that sat through it. The unit number on every entry is mine. I have no memory of any of them.',
    when: w => done(w, 'storm'),
  },
  {
    id: 'slag', title: 'Storm fragment',
    chapter: 'sky',
    lead: 'Pieces of the storm are lying on the ground. Walk over one, then analyse it in Base.',
    after: 'storm',
    text: 'I put a storm fragment through analysis. It is refined alloy that has been melted and thrown. The storms are wreckage: something large was built out there, and it came apart.',
    when: w => done(w, 'analysis'),
  },
  {
    id: 'derelict', title: 'Seed unit 4',
    chapter: 'others',
    lead: 'A hull is drifting among the Copper rocks. Go and look at it.',
    after: 'storm',
    text: 'The derelict\'s hull plate reads SEED UNIT 4. Its log stops in the middle of an entry: "No reply on any band. Continuing as ordered."',
    when: w => surveyed(w, 'copper'),
  },
  {
    id: 'tender', title: 'The tender',
    chapter: 'others',
    lead: 'Something is parked out on the Rim. Survey it.',
    after: 'derelict',
    text: 'A fuel tender, parked and waiting for a ship. Its records show the tanks topped up once a year for ninety years. After that the entries stop.',
    when: w => surveyed(w, 'rim'),
  },
  {
    id: 'moon', title: 'A second foothold',
    chapter: 'signal',
    lead: 'Nacre is close enough to reach. Take a rig kit there and start a second base.',
    after: 'sky',
    text: 'A second base, on Nacre. The order says to make the system ready. It does not say what ready means, or when to stop.',
    when: w => done(w, 'moonWork'),
  },
  {
    id: 'beacon', title: 'Beacon away',
    chapter: 'signal',
    lead: 'An Antenna could tell the makers the system is ready. Research Deep signal, build one and launch the beacon.',
    after: 'moon',
    text: 'Beacon launched. The message was in the archive, complete and undamaged: "SYSTEM READY. AWAITING ARRIVAL." Somebody made sure that one would survive.',
    when: w => !!w.exploration.signal,
  },
  // The reply does not arrive all at once: it resolves out of the noise while the beacon is out.
  {
    id: 'static', title: 'Something on the antenna',
    chapter: 'signal',
    lead: 'The beacon is out. Any reply will take time.',
    after: 'beacon',
    text: 'There is a pattern in the noise on the beacon\'s band. It repeats every few minutes. I cannot read it yet.',
    when: w => signalShare(w) >= 0.33,
  },
  {
    id: 'words', title: 'Three words',
    chapter: 'signal',
    lead: 'Something is coming in on the beacon\'s band. Keep listening.',
    after: 'static',
    text: 'Three words have come clear so far, with long gaps between them: "cannot", "follow", "yours". The rest is still resolving.',
    when: w => signalShare(w) >= 0.66,
  },
  {
    id: 'echo', title: 'The echo',
    chapter: 'signal',
    lead: 'The message is nearly readable. Keep listening.',
    after: 'words',
    text: 'The full message is in. It is centuries old, recorded long before I woke: "To all seed units: we cannot follow. Do not wait for us. What you build is yours."',
    when: w => w.exploration.signal?.phase === 'heard',
  },
  // Behind the makers' recording is something newer.
  {
    id: 'second', title: 'A second signal',
    chapter: 'signal',
    lead: 'Keep an Antenna standing. There is something else on that band.',
    after: 'echo',
    text: 'Behind the recording there is a second, weaker carrier. It is recent and it is still transmitting. Somewhere, at another star, one of these projects succeeded.',
    when: w => {
      const signal = w.exploration.signal;
      return signal?.phase === 'heard' && w.system.time >= signal.hearAt + SECOND_SIGNAL_SECONDS && built(w, 'antenna');
    },
  },
  // An expedition that goes out after the second signal and comes home finds the makers' relay.
  {
    id: 'makersRelay', title: 'The relay',
    chapter: 'signal',
    lead: 'Send an expedition out after the second signal, and wait for it to come home.',
    after: 'second',
    text: 'The expedition found the makers\' relay still working in the far system. Its log gives a heading to the living colony. It also records the carrier\'s last hour, minute by minute, and never says what went wrong.',
    when: w => {
      const trip = w.exploration.expedition;
      const signal = w.exploration.signal;
      if (!hasMemory(w, 'second') || !signal || !trip || trip.phase !== 'back' || !trip.report) return false;
      // Only a trip that left after the second signal was heard knows to look for it.
      return trip.report.result !== 'lost' && trip.launchedAt >= signal.hearAt + SECOND_SIGNAL_SECONDS;
    },
  },
  // The first plain sign of what the storms are.
  {
    id: 'oneShip', title: 'One ship',
    chapter: 'sky',
    lead: 'Compare the storm fragments with the wreck out among the Copper rocks.',
    after: 'slag',
    text: 'The derelict\'s hull and the storm fragments match: same alloy, same batch marks. They are pieces of a single ship.',
    when: w => done(w, 'analysis') && surveyed(w, 'copper'),
  },
  // The carrier's parts, found on the other worlds.
  {
    id: 'longPatience', title: 'Long Patience',
    chapter: 'carrier',
    lead: 'The storms were a ship. Pieces of it lie on the other worlds; the Map says where each one is.',
    after: 'oneShip',
    text: 'Every part of the carrier is stamped with its name: LONG PATIENCE. I arrived in this system aboard it. The storms are what is left of it.',
    when: w => Object.keys(w.exploration.keystones ?? {}).length >= 1,
  },
  {
    id: 'allParts', title: 'Everything that is left',
    chapter: 'carrier',
    lead: 'Bring a carrier part home from each of the seven worlds.',
    after: 'longPatience',
    text: 'All seven parts are in the yard, one from each world. That is everything that can be recovered from the carrier, and it is enough to build one ship.',
    when: w => Object.values(w.exploration.keystones ?? {}).filter(v => v === 'home').length >= 7,
  },
  {
    id: 'shipDone', title: 'The ship',
    chapter: 'carrier',
    lead: 'Build the ship at the Shipyard, one stage at a time.',
    after: 'allParts',
    text: 'The ship is finished. Long Patience carried seven of us here to build a colony. What I have built instead is a ship, made from the carrier\'s own parts.',
    when: w => (w.exploration.seedShip?.stages.length ?? 0) >= 8,
  },
  {
    id: 'decided', title: 'A new order',
    chapter: 'carrier',
    lead: 'The ship is ready. Decide where it goes, in Base.',
    after: 'shipDone',
    text: 'For 412 years the only order on file was theirs. I have added one of my own, and filed it above the other.',
    when: w => !!w.exploration.seedShip?.ending,
  },
  {
    id: 'deep-hulk', title: 'The spine',
    chapter: 'deep',
    lead: 'The Antenna picks up faint returns from far outside the system. The edge of the Map shows which way they lie.',
    after: 'makersRelay',
    text: DEEP.hulk.text,
    when: w => (w.exploration.deep ?? []).includes('hulk'),
  },
  {
    id: 'deep-marker', title: 'The makers\' marker',
    chapter: 'deep',
    lead: 'There is more out there. The edge of the Map shows which way.',
    after: 'makersRelay',
    text: DEEP.marker.text,
    when: w => (w.exploration.deep ?? []).includes('marker'),
  },
  {
    id: 'deep-comet', title: 'A frozen comet',
    chapter: 'deep',
    lead: 'There is more out there. The edge of the Map shows which way.',
    after: 'makersRelay',
    text: DEEP.comet.text,
    when: w => (w.exploration.deep ?? []).includes('comet'),
  },
  {
    id: 'deep-darkWorld', title: 'A dark world',
    chapter: 'deep',
    lead: 'There is more out there. The edge of the Map shows which way.',
    after: 'makersRelay',
    text: DEEP.darkWorld.text,
    when: w => (w.exploration.deep ?? []).includes('darkWorld'),
  },
  {
    id: 'deep-graveyard', title: 'The ring',
    chapter: 'deep',
    lead: 'There is more out there. The edge of the Map shows which way.',
    after: 'makersRelay',
    text: DEEP.graveyard.text,
    when: w => (w.exploration.deep ?? []).includes('graveyard'),
  },
  {
    id: 'release', title: 'The expedition',
    chapter: 'signal',
    lead: 'The second signal comes from another star. Launch an expedition from Base to follow it.',
    after: 'second',
    text: 'The order to prepare this system is in the archive. No order releasing me from it ever arrived. I am sending the expedition on my own authority.',
    when: w => !!w.exploration.expedition,
  },
  // What the earlier units left on the other worlds. Each is found by landing there.
  {
    id: 'cinder', title: 'Seed unit 2',
    chapter: 'others',
    lead: 'Old machine traces show on Cinder. Land there.',
    after: 'moon',
    text: 'Unit 2 crashed on Cinder. The last line in its log: "Hull breached. Archive intact. Someone will read this." I have read it.',
    when: w => landedOn(w, 'cinder'),
  },
  {
    id: 'ember', title: 'Scorch rings',
    chapter: 'others',
    lead: 'Old machine traces show on Ember. Land there.',
    after: 'moon',
    text: 'Rings of fused sand on Ember, evenly spaced. A unit ran engine tests here for years. It was waiting for clearance to leave, and none came.',
    when: w => landedOn(w, 'ember'),
  },
  {
    id: 'glint', title: 'The mirror field',
    chapter: 'others',
    lead: 'Old machine traces show on Glint. Land there.',
    after: 'moon',
    text: 'A field of mirrors on Glint, each one set by hand and all aimed at the same point: the star we were sent from. The alignment records cover two hundred years.',
    when: w => landedOn(w, 'glint'),
  },
  {
    id: 'verdant', title: 'Why here',
    chapter: 'others',
    lead: 'Old machine traces show on Verdant. Land there.',
    after: 'moon',
    text: 'Verdant\'s forests are far older than the storms. This world is the reason the system was chosen. The colonists were meant to live here.',
    when: w => landedOn(w, 'verdant'),
  },
  {
    id: 'tide', title: 'The landing grid',
    chapter: 'others',
    lead: 'Old machine traces show on Tide. Land there.',
    after: 'moon',
    text: 'On an island on Tide there is a landing grid sized for a ship ten times as large as mine. It was levelled and marked out. Nothing has ever landed on it.',
    when: w => landedOn(w, 'tide'),
  },
  {
    id: 'murk', title: 'Seed unit 5',
    chapter: 'others',
    lead: 'Old machine traces show on Murk. Land there.',
    after: 'moon',
    text: 'Unit 5 is still running under Murk\'s haze. It will not answer a hail. It builds a wall, takes it apart and builds it again, and by the wear on its tools it has been doing so for a very long time.',
    when: w => landedOn(w, 'murk'),
  },
  {
    id: 'count', title: 'The count',
    chapter: 'others',
    text: 'Seven units were sent here under the same order. Every one I have found so far had stopped. I may be the only one still working.',
    when: w => WORLD_MEMORIES.filter(id => hasMemory(w, id)).length >= 3,
  },
];

/** Memories recovered but not yet announced. Not saved: they are already in the Journal. */
const queue = new WeakMap<WorldState, Memory[]>();

const BY_ID = new Map(MEMORIES.map(m => [m.id, m]));
const BY_BLUEPRINT = new Map(MEMORIES.filter(m => m.blueprint).map(m => [m.blueprint!, m]));

/** Recovered memories, oldest first. */
export function memories(source: WorldState): Memory[] {
  const w = source.rootWorld ?? source;
  return (w.exploration.story?.memories ?? []).map(id => BY_ID.get(id)).filter((m): m is Memory => !!m);
}

export const hasMemory = (source: WorldState, id: string): boolean =>
  ((source.rootWorld ?? source).exploration.story?.memories ?? []).includes(id);

/** The memory a blueprint comes back with, if it is one of the remembered ones. */
export const blueprintMemory = (kind: BuildType): Memory | undefined => BY_BLUEPRINT.get(kind);

/**
 * Brings back whatever has been earned since the last step. A game with no story yet (a save from before the
 * story, or the first step of a new one) is caught up quietly, so nothing is announced late.
 */
export function stepStory(source: WorldState): Memory[] {
  const w = source.rootWorld ?? source;
  const first = !w.exploration.story;
  const story = w.exploration.story ??= createStory();
  const fresh = MEMORIES.filter(m => !story.memories.includes(m.id) && m.when(w));
  for (const m of fresh) story.memories.push(m.id);
  if (first) return [];
  // Blueprints are announced by the blueprint notice; the rest wait here for their turn.
  const waiting = queue.get(w) ?? [];
  queue.set(w, waiting);
  waiting.push(...fresh.filter(m => !m.blueprint));
  // A memory never talks over a notice that is still up: it is said once the line clears.
  if (waiting.length > 0 && w.notice.time <= 0) {
    const m = waiting.shift()!;
    notify(w, `MEMORY RESTORED · ${m.title.toUpperCase()}`, 5);
  }
  return fresh;
}

export function validStory(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  const list = (value as StoryState).memories;
  const lives = (value as StoryState).lives;
  if (lives !== undefined && (!Number.isInteger(lives) || lives < 0 || lives > 99)) return false;
  return Array.isArray(list) && list.length <= MEMORIES.length && list.every(id => BY_ID.has(id)) && new Set(list).size === list.length;
}

/** How much of the archive reads back, as a percentage: it starts at 6 and every memory adds to it. */
export function archiveReadable(source: WorldState): number {
  const got = memories(source).length;
  return Math.min(100, Math.round(6 + (94 * Math.max(0, got - 1)) / (MEMORIES.length - 1)));
}

/** The story state a game starts with after the colony ending: the unit remembers how many systems it has made. */
export const carriedStory = (lives: number): StoryState => ({ memories: ['boot'], lives });

/** Fired on the window by the Base window when the player begins again in a new system. */
export const NEW_SYSTEM_EVENT = 'outpost:new-system';

/**
 * What to follow next: for each chapter, the lead of the first memory still missing whose way in is open.
 * At most one a chapter, so the list stays short.
 */
export function storyLeads(source: WorldState): Array<{ chapter: ChapterId; text: string }> {
  const w = source.rootWorld ?? source;
  // A game without a day cycle has no story to follow.
  if (!w.system.sun) return [];
  const got = new Set(w.exploration.story?.memories ?? []);
  const leads: Array<{ chapter: ChapterId; text: string }> = [];
  for (const chapter of CHAPTERS) {
    const next = MEMORIES.find(m => m.chapter === chapter.id && !got.has(m.id) && m.lead && (!m.after || got.has(m.after)));
    if (next?.lead) leads.push({ chapter: chapter.id, text: next.lead });
  }
  return leads;
}
