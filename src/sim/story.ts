import type { BuildType } from './colonyConfig';
import { oreCapacity, productCapacity } from './colony';
import { PRODUCTS } from './colonyConfig';
import { notify } from './messages';
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
export interface Memory {
  id: string;
  title: string;
  /** What the unit recalls, in its own voice. One or two short lines. */
  text: string;
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
    id: 'boot', title: 'Resuming',
    text: 'Seed unit 7. Dormant 412 years. Memory archive 6% readable. Standing order: make this system ready for those who follow.',
    when: () => true,
  },
  {
    id: 'inherited', title: 'Not the first',
    text: 'This is not the first system. The archive came whole this time: one colony made, one ship sent on. Begin again.',
    when: w => (w.exploration.story?.lives ?? 0) > 0,
  },
  {
    id: 'firstOre', title: 'Ore in the depot',
    text: 'Something in the archive stirs at the weight of it. What you need comes back when you need it.',
    when: w => done(w, 'delivery'),
  },
  {
    id: 'firstMetal', title: 'First metal',
    text: 'The first metal this unit has made in four centuries. The archive is not empty. It is asleep.',
    when: w => done(w, 'industry'),
  },
  {
    id: 'battery', title: 'Battery', blueprint: 'battery',
    text: 'Dusk. The panels go quiet and the machines with them. You remember how to keep the light.',
    when: w => done(w, 'industry') && (night(w) || w.unloaded >= 200),
  },
  {
    id: 'fuelProcessor', title: 'Fuel processor', blueprint: 'fuelProcessor',
    text: 'The tanks are lower every time you land. Ice is fuel, if you remember how.',
    when: w => done(w, 'industry') && (w.ship.fuel < 0.6 * fuelCapacity(w.ship) || w.unloaded >= 150),
  },
  {
    id: 'storage', title: 'Storage', blueprint: 'storage',
    text: 'The depot fills faster than it empties. You remember shelves.',
    when: w => done(w, 'industry') && (depotShare(w) >= 0.5 || fullestProduct(w) >= 0.6 || w.unloaded >= 300),
  },
  {
    id: 'miningRig', title: 'Mining rig', blueprint: 'miningRig',
    text: 'You have carried every kilogram here by hand. The ground under the base holds ore too.',
    when: w => done(w, 'industry') && (w.unloaded >= 250 || surveyed(w, 'frost')),
  },
  {
    id: 'relay', title: 'Power relay', blueprint: 'relay',
    text: 'The base is outgrowing its own wiring. A pylon carries power farther.',
    when: w => done(w, 'industry') && w.colony.buildings.length >= 5,
  },
  {
    id: 'condenser', title: 'Air condenser', blueprint: 'condenser',
    text: 'The fuel plant drinks water. There is water in the air, thin as it is.',
    when: w => done(w, 'industry') && built(w, 'fuelProcessor'),
  },
  {
    id: 'buoy', title: 'The buoy',
    text: 'The buoy is not yours. It is your makers\'. It still repeats its last order: WATCH THE SKY. It does not say for what.',
    when: w => surveyed(w, 'frost'),
  },
  {
    id: 'sky', title: 'The instrument',
    text: 'The Observatory opens its eye. The sky is not empty, and it is not still.',
    when: w => done(w, 'sky'),
  },
  {
    id: 'storm', title: 'After the storm',
    text: 'The archive lists forty storms, logged by a unit that was awake for them. That unit was you. You remember none.',
    when: w => done(w, 'storm'),
  },
  {
    id: 'slag', title: 'Not rock',
    text: 'The storm pieces are slag: worked metal, melted and flung. Something was built out there once, and broken.',
    when: w => done(w, 'analysis'),
  },
  {
    id: 'derelict', title: 'Seed unit 4',
    text: 'The derelict\'s hull plate reads SEED UNIT 4. Its log ends mid-line: "No reply on any band. Continuing as ordered."',
    when: w => surveyed(w, 'copper'),
  },
  {
    id: 'tender', title: 'The tender',
    text: 'The tender was fuelled for a ship that never came. Its tanks were topped up every year for ninety years, then not.',
    when: w => surveyed(w, 'rim'),
  },
  {
    id: 'moon', title: 'A second foothold',
    text: 'Nacre. The order said: make ready. It never said how much is enough.',
    when: w => done(w, 'moonWork'),
  },
  {
    id: 'beacon', title: 'Beacon away',
    text: '"SYSTEM READY. AWAITING ARRIVAL." The words were in the archive whole, as if kept for this.',
    when: w => !!w.exploration.signal,
  },
  // The reply does not arrive all at once: it resolves out of the noise while the beacon is out.
  {
    id: 'static', title: 'Something on the antenna',
    text: 'A pattern in the hiss, on the beacon\'s own band. Not noise. Not yet words. It repeats.',
    when: w => signalShare(w) >= 0.33,
  },
  {
    id: 'words', title: 'Three words',
    text: 'Three words lift out of the static, far apart: "cannot". "follow". "yours". The rest is still coming.',
    when: w => signalShare(w) >= 0.66,
  },
  {
    id: 'echo', title: 'The echo',
    text: 'It is not a reply. It is a recording, centuries old: "To all seed units: we cannot follow. Do not wait for us. What you build is yours."',
    when: w => w.exploration.signal?.phase === 'heard',
  },
  // Behind the makers' recording is something newer.
  {
    id: 'second', title: 'A second signal',
    text: 'Under the makers\' recording, a fainter carrier wave. Newer. Still sending. One project, at another star, worked.',
    when: w => {
      const signal = w.exploration.signal;
      return signal?.phase === 'heard' && w.system.time >= signal.hearAt + SECOND_SIGNAL_SECONDS && built(w, 'antenna');
    },
  },
  // An expedition that goes out after the second signal and comes home finds the makers' relay.
  {
    id: 'makersRelay', title: 'The relay',
    text: 'The makers\' relay still turns in the far system. Its log holds a heading to the living colony, and the carrier\'s last hour. No cause.',
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
    text: 'The derelict\'s hull and the storm slag are the same alloy, from the same pour. They were one ship. It broke.',
    when: w => done(w, 'analysis') && surveyed(w, 'copper'),
  },
  // The carrier's parts, found on the other worlds.
  {
    id: 'longPatience', title: 'Long Patience',
    text: 'The carrier had a name, stamped into every part of it: LONG PATIENCE. You came here aboard it. So did the storms.',
    when: w => Object.keys(w.exploration.keystones ?? {}).length >= 1,
  },
  {
    id: 'allParts', title: 'Everything that is left',
    text: 'Seven parts, from seven worlds, in one yard. It is everything that is left of the carrier. It is enough for one ship.',
    when: w => Object.values(w.exploration.keystones ?? {}).filter(v => v === 'home').length >= 7,
  },
  {
    id: 'shipDone', title: 'One ship',
    text: 'It stands in the yard, whole. The carrier brought seven of you here to build a world. You built a ship out of the carrier.',
    when: w => (w.exploration.seedShip?.stages.length ?? 0) >= 8,
  },
  {
    id: 'decided', title: 'Your own order',
    text: 'For 412 years the only order was theirs. This one is yours. The archive files it first, above the other.',
    when: w => !!w.exploration.seedShip?.ending,
  },
  {
    id: 'release', title: 'Not an order',
    text: 'The archive kept the order all this time. It never held the release. The expedition leaves anyway, because you chose it.',
    when: w => !!w.exploration.expedition,
  },
  // What the earlier units left on the other worlds. Each is found by landing there.
  {
    id: 'cinder', title: 'Seed unit 2',
    text: 'Unit 2 came down hard on Cinder. Its last line: "Hull breached. Archive intact. Someone will read this." You are reading it.',
    when: w => landedOn(w, 'cinder'),
  },
  {
    id: 'ember', title: 'Scorch rings',
    text: 'Rings burned into Ember\'s sand, evenly spaced. A unit tested its engines here for years, waiting on a reply before it could leave.',
    when: w => landedOn(w, 'ember'),
  },
  {
    id: 'glint', title: 'The mirror field',
    text: 'Mirrors on Glint, aligned by hand, aimed at one patch of sky: the makers\' star. They tracked it for two centuries.',
    when: w => landedOn(w, 'glint'),
  },
  {
    id: 'verdant', title: 'Why here',
    text: 'Verdant\'s forests are older than the storms. This is why the makers chose the system. The colonists were meant to live here.',
    when: w => landedOn(w, 'verdant'),
  },
  {
    id: 'tide', title: 'The landing grid',
    text: 'On an island on Tide, a landing grid for a ship ten times your size. Levelled, marked, never used.',
    when: w => landedOn(w, 'tide'),
  },
  {
    id: 'murk', title: 'Seed unit 5',
    text: 'Under Murk\'s haze unit 5 is still running. It does not answer. It builds the same wall, takes it down, and builds it again.',
    when: w => landedOn(w, 'murk'),
  },
  {
    id: 'count', title: 'The count',
    text: 'Seven units were sent to this system with the same order. Six stopped. You are what is left of the plan.',
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
    notify(w, `MEMORY RESTORED · ${m.title.toUpperCase()} · SEE THE JOURNAL`, 5);
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
