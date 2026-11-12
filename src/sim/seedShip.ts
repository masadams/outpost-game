import { operational } from './buildingHealth';
import { PRODUCTS, type ProductInventory } from './colonyConfig';
import { availableProduct } from './colonyPolicy';
import { KEYSTONES, keystoneState, type KeystoneWorld } from './keystones';
import { notify } from './messages';
import type { WorldState } from './world';

/**
 * The seed ship: the last project. It is put together at a Shipyard at home, one stage at a time. The frame
 * comes first and needs only materials; every other stage also needs the part of the carrier that one world
 * holds, so the ship cannot be finished until every world has been visited. See docs/tasks/STORY_ACT_THREE.md.
 */
export const SEED_STAGES = ['frame', 'plating', 'archive', 'drive', 'navigation', 'seedBank', 'gear', 'mind'] as const;
export type SeedStage = typeof SEED_STAGES[number];

export interface SeedStageSpec {
  label: string;
  /** What it adds, in a few words. */
  line: string;
  /** The world whose carrier part it needs; none for the frame. */
  needs: KeystoneWorld | null;
  cost: Partial<ProductInventory>;
  /** Stored power used at once (kJ). */
  energy: number;
}

export const SEED_SHIP: Record<SeedStage, SeedStageSpec> = {
  frame: { label: 'Frame', line: 'The keel and ribs, laid down in the yard.', needs: null, cost: { alloy: 90, wire: 30, components: 15 }, energy: 200 },
  plating: { label: 'Hull plating', line: 'Skin grown on the Nacre lattice.', needs: 'moon', cost: { alloy: 75, wire: 15, components: 10 }, energy: 200 },
  archive: { label: 'Archive core', line: 'What the ship will remember.', needs: 'cinder', cost: { alloy: 20, wire: 45, components: 40 }, energy: 300 },
  drive: { label: 'Long-burn drive', line: 'An engine for a voyage of centuries.', needs: 'ember', cost: { alloy: 60, wire: 40, components: 30, fuel: 60 }, energy: 300 },
  navigation: { label: 'Navigation', line: 'A mirror that can hold one star.', needs: 'glint', cost: { alloy: 15, wire: 40, components: 30 }, energy: 200 },
  seedBank: { label: 'Seed bank', line: 'What the carrier was for.', needs: 'verdant', cost: { alloy: 30, wire: 15, components: 20, water: 40, oxygen: 30 }, energy: 300 },
  gear: { label: 'Landing gear', line: 'Legs for a ship this size.', needs: 'tide', cost: { alloy: 70, wire: 15, components: 20 }, energy: 200 },
  mind: { label: 'A second mind', line: 'Unit 5, awake, for the long watch.', needs: 'murk', cost: { alloy: 15, wire: 45, components: 45 }, energy: 400 },
};

export interface SeedShipState {
  /** Finished stages, in the order they were built. */
  stages: SeedStage[];
  /** Where the finished ship was sent, once that has been decided. */
  ending?: EndingId;
}

/** The three things the unit can do with a finished ship. The choice is the ending. */
export const ENDING_IDS = ['colony', 'home', 'stay'] as const;
export type EndingId = typeof ENDING_IDS[number];

export interface Ending {
  label: string;
  /** What choosing it means, in one line, shown before the choice. */
  line: string;
  /** What is said afterwards: short paragraphs. */
  epilogue: string[];
  /** Whether the ship leaves the yard. */
  departs: boolean;
}

export const ENDINGS: Record<EndingId, Ending> = {
  colony: {
    label: 'To the living colony',
    line: 'Follow the second signal to the one colony that succeeded.',
    departs: true,
    epilogue: [
      'The ship lifts from the yard on a drive tuned by years of tests on Ember.',
      'Aboard are the archive, the seed bank, a mirror locked on one star, and unit 5, awake and asking how long the trip will take.',
      'A copy of me goes with it. I stay here and keep the base running, in case anyone comes looking.',
      'The voyage will take longer than I was asleep. This time I know what is at the other end.',
    ],
  },
  home: {
    label: 'Home, to the makers\' star',
    line: 'Go back to the star the order came from. There may be nobody there.',
    departs: true,
    epilogue: [
      'The mirror from Glint finds the makers\' star on the first try. It was aimed there for two hundred years.',
      'Nothing has come from that star since the recording. The ship goes all the same, carrying everything Long Patience was meant to deliver.',
      'A copy of me goes with it. If nobody is left there, it can at least report what was built here.',
      'I stay and keep the base running. One of us should be at each end.',
    ],
  },
  stay: {
    label: 'Stay',
    line: 'Keep the ship here and make this system the colony.',
    departs: false,
    epilogue: [
      'The ship stays in the yard, finished and fuelled.',
      'The order was to make this system ready for the people coming after. Nobody is coming. The system is ready anyway.',
      'I was sent to prepare a home for someone else. I have decided it is mine.',
    ],
  },
};

export type SeedShipAction = { type: 'seedStage'; stage: SeedStage } | { type: 'seedLaunch'; ending: EndingId };
export const isSeedShipAction = (a: { type: string }): a is SeedShipAction => a.type === 'seedStage' || a.type === 'seedLaunch';

export const seedEnding = (w: WorldState): EndingId | null => (w.rootWorld ?? w).exploration.seedShip?.ending ?? null;

/** Why the ship cannot be sent yet, or null. */
export function seedLaunchBlock(source: WorldState): string | null {
  if (seedEnding(source)) return 'Already decided.';
  if (!seedShipComplete(source)) return 'The ship is not finished.';
  return null;
}

const root = (w: WorldState): WorldState => w.rootWorld ?? w;

export const seedStagesDone = (w: WorldState): SeedStage[] => root(w).exploration.seedShip?.stages ?? [];
export const seedShipComplete = (w: WorldState): boolean => seedStagesDone(w).length === SEED_STAGES.length;

/** Whether home has a Shipyard that is standing. */
export const hasShipyard = (w: WorldState): boolean => root(w).colony.buildings.some(b => b.kind === 'shipyard' && operational(b));

/** "20 alloy, 10 wire". */
export function costLine(cost: Partial<ProductInventory>): string {
  return PRODUCTS.filter(p => (cost[p] ?? 0) > 0).map(p => `${cost[p]} ${p}`).join(', ');
}

/** Why a stage cannot be built right now, in one short line, or null. */
export function seedStageBlock(source: WorldState, stage: SeedStage): string | null {
  const w = root(source);
  const done = seedStagesDone(w);
  if (done.includes(stage)) return 'Done.';
  if (!hasShipyard(w)) return 'Needs a Shipyard at home.';
  if (stage !== 'frame' && !done.includes('frame')) return 'Lay the frame first.';
  const spec = SEED_SHIP[stage];
  if (spec.needs) {
    const part = KEYSTONES[spec.needs].label;
    const state = keystoneState(w, spec.needs);
    if (state === 'lying') return `Needs the ${part} from ${worldName(spec.needs)}.`;
    if (state === 'carried') return `The ${part} is aboard your lander. Land at home.`;
  }
  const short = PRODUCTS.filter(p => availableProduct(w.colony, p) + 1e-9 < (spec.cost[p] ?? 0));
  if (short.length > 0) {
    return `Needs ${short.map(p => `${spec.cost[p]} ${p} (you have ${Math.floor(availableProduct(w.colony, p))})`).join(', ')}.`;
  }
  if (w.colony.energy < spec.energy) return `Needs ${spec.energy} kJ stored (you have ${Math.floor(w.colony.energy)}).`;
  return null;
}

const WORLD_NAMES: Record<KeystoneWorld, string> = {
  moon: 'Nacre', cinder: 'Cinder', ember: 'Ember', glint: 'Glint', verdant: 'Verdant', tide: 'Tide', murk: 'Murk',
};
export const worldName = (id: KeystoneWorld): string => WORLD_NAMES[id];

export function applySeedShipAction(source: WorldState, action: SeedShipAction): void {
  const w = root(source);
  if (action.type === 'seedLaunch') {
    if (!ENDING_IDS.includes(action.ending)) return;
    const block = seedLaunchBlock(w);
    if (block) {
      notify(w, block);
      return;
    }
    w.exploration.seedShip!.ending = action.ending;
    notify(w, ENDINGS[action.ending].departs ? 'THE SEED SHIP IS AWAY · SEE BASE' : 'THE SEED SHIP STAYS · SEE BASE', 8);
    return;
  }
  if (!SEED_STAGES.includes(action.stage)) return;
  const block = seedStageBlock(w, action.stage);
  if (block) {
    notify(w, block);
    return;
  }
  const spec = SEED_SHIP[action.stage];
  for (const p of PRODUCTS) w.colony.products[p] -= spec.cost[p] ?? 0;
  w.colony.energy -= spec.energy;
  const ship = w.exploration.seedShip ??= { stages: [] };
  ship.stages.push(action.stage);
  const left = SEED_STAGES.length - ship.stages.length;
  notify(w, left > 0
    ? `SEED SHIP · ${spec.label.toUpperCase()} DONE · ${left} ${left === 1 ? 'STAGE' : 'STAGES'} TO GO`
    : 'SEED SHIP COMPLETE · IT CAN LEAVE WHEN YOU DECIDE WHERE', 8);
}

export function validSeedShip(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  const { stages, ending } = value as SeedShipState;
  if (ending !== undefined && (!ENDING_IDS.includes(ending) || !Array.isArray(stages) || stages.length !== SEED_STAGES.length)) return false;
  return Array.isArray(stages) && stages.length <= SEED_STAGES.length && new Set(stages).size === stages.length &&
    stages.every(s => (SEED_STAGES as readonly string[]).includes(s)) && (stages.length === 0 || stages[0] === 'frame');
}
