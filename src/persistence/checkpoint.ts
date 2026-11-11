import {validAutopilot} from '../sim/autopilot';
import {validBuildingUpgrade} from '../sim/buildingUpgrades';
import { validCrewOrder } from '../sim/crewOrders';
import { validObjectives } from '../sim/objectives';
import { BODY_IDS, planetAt, relative, relativeVelocity } from '../sim/celestial';
import { colonyWorld } from '../sim/localWorld';
import { cargoMass } from '../sim/shipMass';
import { validShields } from './validateShields';
import { validProgression } from './validateProgression';
import { fuelCapacity, cargoCapacity } from '../sim/shipStats';
import { validExploration } from './validateExploration';
import { validCommand } from './validateCommand';
import { HABITATS, HABITAT, isHabitat } from '../sim/habitatConfig';
import { validTowing } from './validateTowing';
import { validGeology } from './validateGeology';
import { validSchedule } from '../sim/scheduling';
import { validPolicy } from '../sim/colonyPolicy';
import { validCombat } from './validateCombat';
import { validDefence } from './validateDefence';
import { airCapacity } from '../sim/habitats';
import { createWorld, shareResearch, type OutpostId, type WorldState } from '../sim/world';
import { BUILD_TYPES, PRODUCTS, REFINERY_RECIPES } from '../sim/colonyConfig';
import { energyCapacity, MAX_BUILDINGS, oreCapacity, productCapacity } from '../sim/colony';
import { inventoryMass, RESOURCES } from '../sim/resources';
import { WORLD } from '../sim/config';
import { NOTICE_MAX_SECONDS } from '../sim/messages';
import { SUIT } from '../sim/astronaut';

export const SAVE_VERSION=34;
export const SAVE_KEY = 'outpost.checkpoint.v1'; // Stable slot key; the envelope version rejects incompatible development saves.
export const PREVIOUS_SAVE_KEY = 'outpost.checkpoint.previous';
type RecordValue = Record<string, unknown>;
const object = (value: unknown): value is RecordValue => value !== null && typeof value === 'object' && !Array.isArray(value);
const number = (value: unknown, min = 0, max = 1e9): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
function shape(template: unknown, value: unknown): boolean {
  if (template === null) return true; // Nullable fields have explicit validators below.
  if (typeof template === 'number') return number(value, -1e12, 1e12);
  if (Array.isArray(template)) return Array.isArray(value);
  if (object(template)) return object(value) && Object.keys(template).every(key => shape(template[key], value[key]));
  return typeof template === typeof value;
}
function validWorld(value: unknown, remote = true): value is WorldState {
  const template = createWorld();
  if (!object(value) || !shape(template, value)) return false;
  const world = value as unknown as WorldState;
  if (remote && (Object.hasOwn(world, 'rootWorld') || Object.hasOwn(world, 'siteBody'))) return false;
  if (!number(world.system.time, 0, 1e9) || typeof world.system.binary !== 'boolean' || (world.system.sun !== undefined && typeof world.system.sun !== 'boolean') || !PRODUCTS.every(p => number(world.ship.freight[p], 0, cargoCapacity(world.ship))) || cargoMass(world.ship) > cargoCapacity(world.ship) + 1e-6 || world.ship.ground !== undefined && !(BODY_IDS as readonly string[]).includes(world.ship.ground)) return false;
  if (remote) {
    const facilities = [world.colony, ...Object.values(world.outposts).map(o => o?.colony)].flatMap(c => c?.buildings ?? []);
    if (new Set(facilities.map(b => b?.id)).size !== facilities.length) return false;
  }
  if (world.ship.ground && world.ship.state !== 'flying') {
    const p = planetAt(world.ship.ground, world.system), r = relative(world.ship.position, p), v = relativeVelocity(world.ship.velocity, p, world.ship.position);
    if (Math.abs(Math.hypot(r.x, r.y) - p.radius - WORLD.shipRadius) > .2 || Math.hypot(v.x, v.y) > .5) return false;
  }
  if (remote && (!Number.isInteger(world.seed) || world.seed < 0 || world.seed > 4294967295)) return false;
  if (remote && (!object(world.outposts) || BODY_IDS.some(id => id !== 'home' && (!object(world.outposts[id as OutpostId]) || JSON.stringify(world.outposts[id as OutpostId].colony.research) !== JSON.stringify(world.colony.research) || !validWorld(colonyWorld(world, id), false))))) return false;
  if (!validCrewOrder(world) || !validObjectives(world.objectives) || !validProgression(world) || !validAutopilot(world)) return false;
  if (!['ship', 'astronaut'].includes(world.playerMode) || !['landed', 'flying', 'crashed'].includes(world.ship.state)) return false;
  if (!number(world.ship.fuel, 0, fuelCapacity(world.ship)) || !number(world.ship.hull, 0, 100) || !number(world.astronaut.oxygen, 0, SUIT.oxygen + 1e-6) || !number(world.astronaut.health, 0, 100) || !RESOURCES.every(r => number(world.astronaut.bag[r], 0, SUIT.bagCapacity + 1e-6)) || inventoryMass(world.astronaut.bag) > SUIT.bagCapacity + 1e-6) return false;
  if (!RESOURCES.every(r => number(world.depot[r]) && number(world.ship.cargo[r])) || inventoryMass(world.ship.cargo) > cargoCapacity(world.ship) + 1e-6) return false;
  const colony = world.colony;
  if (colony.policy !== undefined && !validPolicy(colony.policy)) return false;
  if (colony.buildings.length > MAX_BUILDINGS || !BUILD_TYPES.includes(colony.selected) || !number(colony.offset, -96, 96)) return false;
  const buildingShape = { id: 1, kind: '', angle: 0, enabled: true, progress: 0, recipe: 0, status: '' };
  if (!colony.buildings.every(b => shape(buildingShape, b) && Number.isInteger(b.id) && b.id > 0 && BUILD_TYPES.includes(b.kind) && number(b.angle, -Math.PI, Math.PI) &&
    number(b.progress, 0, 200) && Number.isInteger(b.recipe) && b.recipe >= 0 && b.recipe < REFINERY_RECIPES.length && ['idle', 'running', 'no power', 'no feedstock', 'output full', 'disabled', 'wrecked', 'no deposit', 'depleted', 'target met', 'power reserved', 'delivery reserved', 'pressurizing', 'air low', 'breathable', 'power limited', 'starting', 'research staffed', 'shield active', 'shield charging', 'shield breached', 'no fuel', 'worn out'].includes(b.status))) return false;
  if (!colony.buildings.every(b=>validBuildingUpgrade(world,b)))return false;
  if (!colony.buildings.every(b => b.hqLevel === undefined || (b.kind === 'headquarters' && Number.isInteger(b.hqLevel) && b.hqLevel >= 1 && b.hqLevel <= 4))) return false;
  if (colony.buildings.filter(b => b.kind === 'headquarters').length > 1) return false;
  if (!colony.buildings.every(b => (b.boot === undefined || number(b.boot, 0, 60)) && (b.dark === undefined || number(b.dark, 0, 600)) && (b.wait === undefined || number(b.wait, 0, 60)) && (b.linked === undefined || b.linked === false) && (b.feed === undefined || number(b.feed, 0, 1)) && (b.charge === undefined || number(b.charge, 0, 1e6)) && (b.island === undefined || typeof b.island === 'boolean'))) return false;
  if (!number(colony.oxygenUsed) || !colony.buildings.every(b => isHabitat(b.kind) ? !!b.habitat && number(b.habitat.oxygen, 0, airCapacity(b)) && number(b.habitat.energy, 0, HABITATS[b.kind].power * HABITAT.backupSeconds) && typeof b.habitat.powered === 'boolean' && typeof b.habitat.backup === 'boolean' : b.habitat === undefined)) return false;
  if (!colony.buildings.every(b => b.schedule === undefined || b.kind === 'refinery' && validSchedule(b.schedule))) return false;
  if (new Set(colony.buildings.map(b => b.id)).size !== colony.buildings.length || !Number.isInteger(colony.nextId) || colony.nextId <= Math.max(0, ...colony.buildings.map(b => b.id))) return false;
  // Stock may sit above what storage holds for a while (a store was demolished, wrecked or cut off), and the
  // game must still save then. Only nonsense amounts are refused; power is settled to its store before saving.
  if (!PRODUCTS.every(p => number(colony.products[p], 0, STOCK_LIMIT))) return false;
  if (!number(colony.energy, 0, energyCapacity(colony) + 1e-6) || inventoryMass(world.depot) > STOCK_LIMIT) return false;
  const sample = template.asteroids[0];
  const pickupShape = { id: 1, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, radius: 1, mass: 1, resource: '' };
  if (world.asteroids.length > 256 || world.pickups.length > 256) return false;
  if (!world.asteroids.every(b => shape(sample, b) && [0, 1].includes(b.stage) && number(b.health, 0, 1) && number(b.maxHealth, 0.01, 1))) return false;
  if (!world.pickups.every(b => shape(pickupShape, b))) return false;
  const bodies = [...world.asteroids, ...world.pickups];
  if (!bodies.every(b => Number.isInteger(b.id) && b.id > 0 && number(b.mass, 1e-12, 1e6) && number(b.radius, 0.01, 200) && RESOURCES.includes(b.resource))) return false;
  if (new Set(bodies.map(b => b.id)).size !== bodies.length || !Number.isInteger(world.nextId) || world.nextId <= Math.max(0, ...bodies.map(b => b.id))) return false;
  if (world.beam !== null && (!object(world.beam) || !shape({ start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, world.beam))) return false;
  return validShields(world) && validExploration(world) && validCommand(world) && validTowing(world) && validGeology(world) && validCombat(world) && validDefence(world) && validStorm(world) && validWrecks(world) && number(world.unloaded) && number(world.notice.time, 0, NOTICE_MAX_SECONDS) && world.notice.message.length <= 500;
}
function validWrecks(world: WorldState): boolean {
  if (!Array.isArray(world.wrecks) || world.wrecks.length > 8) return false;
  const vec = (v: unknown) => object(v) && number(v.x, -1e7, 1e7) && number(v.y, -1e7, 1e7);
  return world.wrecks.every(w => object(w) && Number.isInteger(w.id) && w.id > 0 && number(w.beaconUntil, 0, 1e9) && number(w.condition, 0, 1) &&
    typeof w.cause === 'string' && w.cause.length <= 40 && object(w.ship) && w.ship.state === 'crashed' && vec(w.ship.position) && vec(w.ship.velocity) &&
    number(w.ship.angle, -1e3, 1e3) && number(w.ship.fuel, 0, 1e4) && object(w.ship.cargo) && object(w.ship.freight) &&
    RESOURCES.every(r => number(w.ship.cargo[r], 0, 1e4)) && PRODUCTS.every(p => number(w.ship.freight[p], 0, 1e4)) &&
    (w.ship.ground === undefined || (BODY_IDS as readonly string[]).includes(w.ship.ground)));
}
function validStorm(world: WorldState): boolean {
  const s = world.storm;
  if (!['quiet', 'approaching', 'over'].includes(s.phase) || typeof s.planned !== 'boolean' || typeof s.armed !== 'boolean' || !number(s.arrival, 0, 1e9) || !number(s.observed, 0, 1e9) || !Array.isArray(s.plan) || s.plan.length > 24) return false;
  if (!Array.isArray(s.samples) || s.samples.length > 32 || !Number.isInteger(s.held) || s.held < 0 || s.held > 32 || typeof s.analysed !== 'boolean' || !Number.isInteger(s.wave) || s.wave < 1 || s.wave > 99 || !number(s.endedAt, 0, 1e9)) return false;
  const counts = (c: unknown, keys: string[]) => object(c) && keys.every(k => Number.isInteger(c[k]) && number(c[k], 0, 1e6));
  if (s.start !== undefined && !counts(s.start, ['stopped', 'landed', 'standing', 'hurt'])) return false;
  if (s.report !== undefined && !counts(s.report, ['wave', 'stopped', 'landed', 'damaged', 'lost'])) return false;
  if (!s.samples.every(p => object(p) && Number.isInteger(p.id) && number(p.angle, -Math.PI - 1e-6, Math.PI + 1e-6))) return false;
  if (!s.plan.every(p => object(p) && Number.isInteger(p.id) && (p.impactAngle === null || number(p.impactAngle, -Math.PI - 1e-6, Math.PI + 1e-6)) && (p.impactTime === null || number(p.impactTime, 0, 1e9)))) return false;
  if (!Array.isArray(s.far) || !Array.isArray(s.ids) || s.far.length > 24 || s.ids.length > 24) return false;
  const vec = (v: unknown) => object(v) && number(v.x, -1e7, 1e7) && number(v.y, -1e7, 1e7);
  return s.ids.every(id => Number.isInteger(id) && id > 0) && s.far.every(b => object(b) && Number.isInteger(b.id) && vec(b.entry) && vec(b.velocity) &&
    number(b.entryTime, 0, 1e9) && number(b.radius, 0.01, 200) && number(b.mass, 1e-12, 1e6) && number(b.health, 0.01, 40) &&
    (b.impactAngle === null || number(b.impactAngle, -Math.PI - 1e-6, Math.PI + 1e-6)) && (b.impactTime === null || number(b.impactTime, 0, 1e9)));
}
/** The most of any material or ore a base may hold in a save: far above any real storage. */
const STOCK_LIMIT = 100_000;

/** Raised when the game's own state fails its checks. `area` says which part, in plain words. */
export class SaveRefused extends Error {
  constructor(readonly area: string) {
    super(`World state cannot be saved (${area})`);
  }
}

/** Brings values the simulation settles by itself on its next step into range, so a save never trips on them. */
function settleForSave(world: WorldState): void {
  for (const colony of [world.colony, ...Object.values(world.outposts ?? {}).map(o => o.colony)]) {
    colony.energy = Math.max(0, Math.min(colony.energy, energyCapacity(colony)));
  }
  world.notice.time = Math.max(0, Math.min(world.notice.time, NOTICE_MAX_SECONDS));
}

/**
 * Which part of the game stops a save, found by setting one part at a time to something plain and trying again.
 * Only used after a save has already failed, so its cost does not matter.
 */
export function saveProblem(world: WorldState): string {
  const fresh = createWorld(world.seed);
  const probes: Array<[string, (w: WorldState) => void]> = [
    ['rocks in flight', w => { w.defence.meteors = []; w.defence.projectiles = []; w.defence.beams = []; }],
    ['the storm', w => { w.storm = fresh.storm; }],
    ['turrets', w => { for (const b of w.colony.buildings) delete b.turret; w.defence.controlled = null; }],
    ['the build queue', w => { w.colony.command = fresh.colony.command; }],
    ['buildings', w => { w.colony.buildings = []; w.colony.command = fresh.colony.command; w.defence.controlled = null; }],
    ['stored materials', w => { w.colony.products = fresh.colony.products; w.depot = fresh.depot; }],
    ['the lander', w => { w.ship = fresh.ship; w.playerMode = 'ship'; w.towing = fresh.towing; }],
    ['the pilot', w => { w.astronaut = fresh.astronaut; w.playerMode = 'ship'; w.crewOrder = null; }],
    ['exploration', w => { w.exploration = fresh.exploration; }],
    ['wrecks', w => { w.wrecks = []; }],
    ['loose rocks', w => { w.asteroids = []; w.pickups = []; }],
    ['another base', w => { w.outposts = fresh.outposts; }],
    ['research', w => { w.colony.research = fresh.colony.research; shareResearch(w); }],
  ];
  for (const [area, change] of probes) {
    try {
      const copy = structuredClone(world);
      change(copy);
      if (validWorld(copy)) return area;
    } catch {
      // A probe that cannot be applied tells us nothing; try the next.
    }
  }
  return 'unknown';
}

export function encodeCheckpoint(world: WorldState): string {
  world = world.rootWorld ?? world;
  settleForSave(world);
  if (!validWorld(world)) throw new SaveRefused(saveProblem(world));
  return JSON.stringify({ version: SAVE_VERSION, environment: { radius: WORLD.radius, model: 'binary-flight-1' }, world });
}
export function decodeCheckpoint(text: string): WorldState {
  if (text.length > 1_000_000) throw new Error('Checkpoint is too large');
  const envelope: unknown = JSON.parse(text);
  if (!object(envelope) || envelope.version !== SAVE_VERSION || !object(envelope.world)) throw new Error('Checkpoint is incompatible with this development build · R starts a new world');
  if (!object(envelope.environment) || envelope.environment.radius !== WORLD.radius || envelope.environment.model !== 'binary-flight-1') throw new Error('Checkpoint environment is incompatible');
  if (!validWorld(envelope.world)) throw new Error('Checkpoint is invalid');
  const world = envelope.world;
  shareResearch(world);
  if (world.seed !== 0) world.system.seed = world.seed;
  if(world.autopilot.program){world.autopilot.program=null;world.autopilot.status='Checkpoint loaded · automation disarmed';}
  world.combat.flashes = [];
  world.defence.controlled = null; world.defence.beams = [];
  world.buttons = { board: false, interact: false }; world.astronaut.jumpHeld = false; world.beam = null; world.tractorActive = false;
  world.notice = { message: 'CHECKPOINT LOADED · P TO RESUME', time: 3 };
  return world;
}
type CheckpointStorage = Pick<Storage, 'getItem' | 'setItem'>;
export interface CheckpointSelection { world: WorldState | null; source: 'checkpoint' | 'previous' | null }
/** Reads never repair or overwrite storage. Only current-format, fully validated snapshots are usable. */
export function inspectCheckpoint(storage: Pick<Storage, 'getItem'>): CheckpointSelection {
  const primary = storage.getItem(SAVE_KEY);
  if (primary !== null) {
    try { return { world: decodeCheckpoint(primary), source: 'checkpoint' }; } catch { /* Try the previous good checkpoint. */ }
  }
  const previous = storage.getItem(PREVIOUS_SAVE_KEY);
  if (previous !== null) {
    try { return { world: decodeCheckpoint(previous), source: 'previous' }; } catch { /* Both slots are unusable. */ }
  }
  if (primary !== null || previous !== null) throw new Error('No valid current-format checkpoint');
  return { world: null, source: null };
}
export function writeCheckpoint(storage: CheckpointStorage, world: WorldState): void {
  const next = encodeCheckpoint(world); // Validate before touching either slot.
  const current = storage.getItem(SAVE_KEY);
  if (current === next) return; // Repeated saves must not replace the previous distinct checkpoint.
  let valid = false;
  if (current !== null) { try { decodeCheckpoint(current); valid = true; } catch { /* Never rotate corrupt/incompatible data over a good backup. */ } }
  // Each localStorage write is atomic. If rotation fails, leave the primary untouched;
  // if the primary write fails, the old primary is untouched and any valid backup survives.
  if (valid) storage.setItem(PREVIOUS_SAVE_KEY, current!);
  storage.setItem(SAVE_KEY, next);
}
export function readCheckpoint(storage: Pick<Storage, 'getItem'>): WorldState | null { return inspectCheckpoint(storage).world; }
