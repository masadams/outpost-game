import { surfaceAir } from './airMachines';
import { colonyWorld } from './localWorld';
import { energyCapacity, type Building, type Colony } from './colony';
import { operational } from './buildingHealth';
import { isHabitat } from './habitatConfig';
import { notify } from './messages';
import { orbitRock } from './drift';
import { streamFor } from './seed';
import type { BodyId } from './celestial';
import type { WorldState } from './world';

/**
 * Things that happen between storms. They come from a seeded timeline (so the same game tells the same story), are
 * warned about when they can be, and are held back until the story has reached them.
 */
export type EventKind = 'flare' | 'dust' | 'pocket' | 'comet' | 'fault' | 'jumper' | 'debris' | 'leak';
export const EVENT_KINDS: readonly EventKind[] = ['flare', 'dust', 'pocket', 'comet', 'fault', 'jumper', 'debris', 'leak'];

export interface ActiveEvent {
  id: number;
  kind: EventKind;
  starts: number;
  ends: number;
  /** True once the start has been dealt with. */
  begun?: boolean;
  /** The seam being worked by a claim-jumper. */
  seam?: number;
  body?: BodyId;
}
export interface EventsState {
  /** World seconds when the next event is chosen. */
  next: number;
  count: number;
  last?: EventKind;
  active: ActiveEvent[];
  /** Recent happenings, newest last, for the Journal. */
  journal: string[];
}

export const EVENTS = {
  /** No event before this, so the first storm gets the stage. */
  first: 1800,
  /** Quiet seconds after one ends, plus up to `spread` more. */
  gap: 300,
  spread: 400,
  journalLimit: 12,
  limit: 6,
  flare: { lead: 60, duration: 90, boost: 1.5 },
  dust: { lead: 30, duration: 160, solar: 0.5, rigs: 0.7 },
  jumper: { duration: 240, takes: 0.4 },
  debris: { lead: 45, duration: 200, podRisk: 3 },
  fault: { damage: 35 },
  pocket: { low: 0.25, high: 0.5 },
  comet: { rocks: 5 },
  leak: { damage: 20, airLost: 0.5 },
} as const;

export const createEvents = (): EventsState => ({ next: EVENTS.first, count: 0, active: [], journal: [] });

const colonies = (w: WorldState): Colony[] => [w.colony, ...Object.values(w.outposts).map(o => o.colony)];
const built = (w: WorldState, kind: string): boolean => colonies(w).some(c => c.buildings.some(b => b.kind === kind && operational(b)));
const hasWorking = (c: Colony): Building[] => c.buildings.filter(b => operational(b) && b.status === 'running');

function root(w: WorldState): WorldState {
  return w.rootWorld ?? w;
}

/** Whether events run in this game: only seeded day-cycle games; the standard layout stays predictable. */
export const eventsOn = (w: WorldState): boolean => root(w).seed !== 0 && !!root(w).system.sun && !!root(w).exploration.events;

function eligible(w: WorldState): EventKind[] {
  const kinds: EventKind[] = [];
  const done = w.objectives.completed;
  if (built(w, 'observatory')) kinds.push('flare');
  if (surfaceAir(colonyWorld(w, 'home')) > 0 && colonies(w)[0].buildings.some(b => b.kind === 'solar' || b.kind === 'miningRig')) kinds.push('dust');
  if (built(w, 'miningRig') && w.surfaceDeposits.some(d => d.remaining > 1)) kinds.push('pocket');
  if (done.includes('buoy')) kinds.push('comet');
  if (colonies(w).reduce((n, c) => n + c.buildings.length, 0) >= 4) kinds.push('fault');
  if (Object.values(w.outposts).some(o => o.colony.buildings.length > 0) && freeSeams(w).length > 0) kinds.push('jumper');
  if (w.exploration.pods.length > 0 || (w.exploration.beacons?.length ?? 0) > 0 || w.exploration.supply?.enabled) kinds.push('debris');
  if (domes(w).length > 0) kinds.push('leak');
  return kinds;
}

/** Habitats with air in them. */
const domes = (w: WorldState): Building[] => colonies(w).flatMap(c => c.buildings.filter(b => isHabitat(b.kind) && operational(b) && (b.habitat?.oxygen ?? 0) > 0));

/** Home seams with something left and no rig sitting on them. */
function freeSeams(w: WorldState): typeof w.surfaceDeposits {
  const rigs = w.colony.buildings.filter(b => b.kind === 'miningRig');
  return w.surfaceDeposits.filter(d => d.remaining > 20 && !rigs.some(r => r.depositId === d.id));
}

function say(events: EventsState, line: string): void {
  events.journal.push(line);
  if (events.journal.length > EVENTS.journalLimit) events.journal.splice(0, events.journal.length - EVENTS.journalLimit);
}

const activeOf = (w: WorldState, kind: EventKind): ActiveEvent | undefined => {
  const events = root(w).exploration.events;
  const now = root(w).system.time;
  return events?.active.find(e => e.kind === kind && e.starts <= now && now < e.ends);
};

/** Multiplier on solar output right now: a flare brightens it, a dust front dims it. */
export function eventSolarFactor(w: WorldState): number {
  return (activeOf(w, 'flare') ? EVENTS.flare.boost : 1) * (activeOf(w, 'dust') ? EVENTS.dust.solar : 1);
}
/** Multiplier on what a mining rig brings up. */
export const eventRigFactor = (w: WorldState): number => (activeOf(w, 'dust') ? EVENTS.dust.rigs : 1);
/** Multiplier on the chance a pod is lost. */
export const eventPodRisk = (w: WorldState): number => (activeOf(w, 'debris') ? EVENTS.debris.podRisk : 1);
/** Supply lines hold while a debris field is crossing the lanes. */
export const lanesBlocked = (w: WorldState): boolean => !!activeOf(w, 'debris');

/** What to show in the corner: the nearest warning or running event, or null. */
export function eventChip(w: WorldState): { label: string; detail: string; active: boolean } | null {
  const events = root(w).exploration.events;
  if (!events) return null;
  const now = root(w).system.time;
  const names: Record<EventKind, string> = {
    flare: 'Solar flare', dust: 'Dust front', pocket: 'Seam', comet: 'Comet', fault: 'Fault', jumper: 'Claim-jumper', debris: 'Debris field', leak: 'Air leak',
  };
  const e = [...events.active].sort((a, b) => a.starts - b.starts).find(x => x.kind !== 'pocket' && now < x.ends);
  if (!e) return null;
  if (now < e.starts) return { label: names[e.kind], detail: `in ${Math.ceil(e.starts - now)} s`, active: false };
  return { label: names[e.kind], detail: `${Math.ceil(e.ends - now)} s left`, active: true };
}

function begin(w: WorldState, e: ActiveEvent, events: EventsState): void {
  e.begun = true;
  switch (e.kind) {
    case 'flare': {
      const cols = colonies(w);
      const protectedBase = cols.some(c => energyCapacity(c) > 20);
      if (protectedBase) {
        notify(w, 'SOLAR FLARE · THE PANELS ARE RUNNING HOT · BATTERIES SOAK UP THE SURGE');
        say(events, 'A solar flare hit. The batteries soaked up the surge.');
      } else {
        const victim = cols.flatMap(hasWorking).find(b => b.kind !== 'solar');
        if (victim) victim.boot = 0;
        notify(w, 'SOLAR FLARE · A SURGE TRIPPED A MACHINE · BATTERIES WOULD HAVE SOAKED IT UP');
        say(events, 'A solar flare hit and a surge tripped a machine. Batteries would have soaked it up.');
      }
      break;
    }
    case 'dust':
      notify(w, 'A DUST FRONT IS HERE · PANELS DIM AND RIGS SLOW');
      break;
    case 'debris':
      notify(w, 'A DEBRIS FIELD IS CROSSING THE LANES · PODS ARE AT RISK AND SUPPLY LINES ARE HOLDING');
      break;
    case 'jumper':
      notify(w, 'SOMEONE IS WORKING A SEAM YOU HAVE NOT CLAIMED');
      break;
    default:
      break;
  }
}

function finish(w: WorldState, e: ActiveEvent, events: EventsState): void {
  switch (e.kind) {
    case 'flare': notify(w, 'THE FLARE HAS PASSED'); break;
    case 'dust': notify(w, 'THE DUST HAS SETTLED'); say(events, 'A dust front crossed the base.'); break;
    case 'debris': notify(w, 'THE DEBRIS HAS CLEARED THE LANES'); say(events, 'A debris field crossed the pod lanes.'); break;
    case 'jumper': {
      const seam = w.surfaceDeposits.find(d => d.id === e.seam);
      if (seam && !w.colony.buildings.some(b => b.kind === 'miningRig' && b.depositId === seam.id)) {
        notify(w, 'THE CLAIM-JUMPER HAS GONE · IT TOOK A SHARE OF THE SEAM');
        say(events, `A claim-jumper worked the ${seam.resource} seam and left with a share.`);
      }
      break;
    }
    default: break;
  }
}

/** Instant events: a pocket opens, a comet passes, a machine fails. Returns false if nothing could happen. */
function strike(w: WorldState, e: ActiveEvent, events: EventsState, rand: () => number): boolean {
  switch (e.kind) {
    case 'pocket': {
      const seam = w.surfaceDeposits.filter(d => d.remaining > 1).sort((a, b) => b.remaining / b.initial - a.remaining / a.initial)[0];
      if (!seam) return false;
      const extra = Math.round(seam.initial * (EVENTS.pocket.low + rand() * (EVENTS.pocket.high - EVENTS.pocket.low)));
      seam.remaining += extra;
      seam.initial += extra;
      notify(w, `A RICHER POCKET OPENED IN THE ${seam.resource.toUpperCase()} SEAM · +${extra} KG`);
      say(events, `The ${seam.resource} seam opened a richer pocket: ${extra} kg more.`);
      return true;
    }
    case 'comet': {
      const angle = rand() * Math.PI * 2;
      for (let i = 0; i < EVENTS.comet.rocks; i++) orbitRock(w, angle + i * 0.05, 1600 + i * 30, 'ice', 56, 16);
      notify(w, 'A COMET IS PASSING CLOSE · ICE ROCKS ARE DRIFTING IN YOUR ORBIT');
      say(events, 'A comet passed close and left ice rocks in orbit.');
      return true;
    }
    case 'fault': {
      const machines = colonies(w).flatMap(hasWorking).filter(b => !['solar', 'battery', 'storage', 'relay'].includes(b.kind));
      if (machines.length === 0) return false;
      const victim = machines[Math.floor(rand() * machines.length)];
      victim.health = Math.max(1, (victim.health ?? 100) - EVENTS.fault.damage);
      notify(w, `A ${victim.kind.toUpperCase()} HAS SUFFERED A FAULT · PRESS U NEAR IT TO REPAIR`);
      say(events, `A ${victim.kind} developed a fault and needed a repair.`);
      return true;
    }
    case 'leak': {
      const all = domes(w);
      if (all.length === 0) return false;
      const dome = all[Math.floor(rand() * all.length)];
      dome.habitat!.oxygen *= 1 - EVENTS.leak.airLost;
      dome.health = Math.max(1, (dome.health ?? 100) - EVENTS.leak.damage);
      notify(w, 'A DOME IS LEAKING AIR · PRESS U NEAR IT TO PATCH IT');
      say(events, 'A dome sprang a leak and lost half its air.');
      return true;
    }
    default: return true;
  }
}

/** One step of the timeline: choose the next event when it is due, warn, start, run and end them. */
export function stepEvents(source: WorldState, dt: number): void {
  const w = root(source);
  if (!eventsOn(w)) return;
  const events = w.exploration.events!;
  const now = w.system.time;
  for (const e of events.active) {
    if (!e.begun && now >= e.starts) begin(w, e, events);
    if (e.kind === 'jumper' && e.begun && now < e.ends) {
      const seam = w.surfaceDeposits.find(d => d.id === e.seam);
      const rig = w.colony.buildings.some(b => b.kind === 'miningRig' && b.depositId === e.seam);
      if (rig) {
        notify(w, 'YOUR RIG DROVE THE CLAIM-JUMPER OFF');
        say(events, 'A rig on the seam drove a claim-jumper off.');
        e.ends = now;
      } else if (seam) {
        const take = (seam.initial * EVENTS.jumper.takes * dt) / EVENTS.jumper.duration;
        const amount = Math.min(take, seam.remaining);
        seam.remaining -= amount;
      }
    }
  }
  const done = events.active.filter(e => now >= e.ends);
  for (const e of done) finish(w, e, events);
  if (done.length > 0) {
    events.active = events.active.filter(e => now < e.ends);
    events.next = Math.max(events.next, now + EVENTS.gap + streamFor(w.seed, `events/gap/${events.count}`)() * EVENTS.spread);
  }
  if (now < events.next || events.active.length >= EVENTS.limit || events.active.length > 0) return;
  const rand = streamFor(w.seed, `events/${events.count}`);
  const pool = eligible(w).filter(k => k !== events.last);
  events.next = now + EVENTS.gap + rand() * EVENTS.spread;
  if (pool.length === 0) return;
  startEvent(w, pool[Math.floor(rand() * pool.length)], rand);
}

/** Begin one event now. Also used by tests to bring a particular event on. Returns false if it could not happen. */
export function startEvent(source: WorldState, kind: EventKind, rand: () => number = Math.random): boolean {
  const w = root(source);
  const events = w.exploration.events;
  if (!events) return false;
  const now = w.system.time;
  const timing = kind === 'flare' ? EVENTS.flare : kind === 'dust' ? EVENTS.dust : kind === 'debris' ? EVENTS.debris : kind === 'jumper' ? EVENTS.jumper : null;
  const lead = timing && 'lead' in timing ? timing.lead : 0;
  const e: ActiveEvent = { id: w.nextId++, kind, starts: now + lead, ends: now + lead + (timing?.duration ?? 0) };
  if (kind === 'jumper') {
    const seams = freeSeams(w);
    if (seams.length === 0) return false;
    e.seam = seams[Math.floor(rand() * seams.length)].id;
  }
  events.count += 1;
  events.last = kind;
  if (lead > 0) {
    const warnings: Partial<Record<EventKind, string>> = {
      flare: `THE STAR IS FLARING · A SURGE IN ${lead} S`,
      dust: `A DUST FRONT IS ROLLING IN · ${lead} S`,
      debris: `A DEBRIS FIELD IS DRIFTING TOWARD THE LANES · ${lead} S`,
    };
    notify(w, warnings[kind] ?? '');
    events.active.push(e);
    return true;
  }
  if (kind === 'jumper') {
    events.active.push(e);
    return true;
  }
  if (!strike(w, e, events, rand)) {
    events.count -= 1;
    return false;
  }
  return true;
}
