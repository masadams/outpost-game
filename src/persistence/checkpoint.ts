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
import { createWorld, type WorldState } from '../sim/world';
import { BUILD_TYPES, PRODUCTS, REFINERY_RECIPES } from '../sim/colonyConfig';
import { energyCapacity, oreCapacity, productCapacity } from '../sim/colony';
import { inventoryMass, RESOURCES } from '../sim/resources';
import { WORLD } from '../sim/config';
import { SUIT } from '../sim/astronaut';

export const SAVE_KEY = 'outpost.checkpoint.v1'; // Stable slot key; the envelope version rejects incompatible development saves.
type RecordValue = Record<string, unknown>;
const object = (value: unknown): value is RecordValue => value !== null && typeof value === 'object' && !Array.isArray(value);
const number = (value: unknown, min = 0, max = 1e9): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
function shape(template: unknown, value: unknown): boolean {
  if (template === null) return true; // Nullable fields have explicit validators below.
  if (typeof template === 'number') return number(value, -1e9);
  if (Array.isArray(template)) return Array.isArray(value);
  if (object(template)) return object(value) && Object.keys(template).every(key => shape(template[key], value[key]));
  return typeof template === typeof value;
}
function validWorld(value: unknown): value is WorldState {
  const template = createWorld();
  if (!object(value) || !shape(template, value)) return false;
  const world = value as unknown as WorldState;
  if (!validProgression(world)) return false;
  if (!['ship', 'astronaut'].includes(world.playerMode) || !['landed', 'flying', 'crashed'].includes(world.ship.state)) return false;
  if (!number(world.ship.fuel, 0, fuelCapacity(world.ship)) || !number(world.ship.hull, 0, 100) || !number(world.astronaut.oxygen, 0, SUIT.oxygen + 1e-6) || !number(world.astronaut.health, 0, 100)) return false;
  if (!RESOURCES.every(r => number(world.depot[r]) && number(world.ship.cargo[r])) || inventoryMass(world.ship.cargo) > cargoCapacity(world.ship) + 1e-6) return false;
  const colony = world.colony;
  if (colony.policy !== undefined && !validPolicy(colony.policy)) return false;
  if (colony.buildings.length > 48 || !BUILD_TYPES.includes(colony.selected) || !number(colony.offset, -96, 96)) return false;
  const buildingShape = { id: 1, kind: '', angle: 0, enabled: true, progress: 0, recipe: 0, status: '' };
  if (!colony.buildings.every(b => shape(buildingShape, b) && Number.isInteger(b.id) && b.id > 0 && BUILD_TYPES.includes(b.kind) && number(b.angle, -Math.PI, Math.PI) &&
    number(b.progress, 0, 3) && Number.isInteger(b.recipe) && b.recipe >= 0 && b.recipe < REFINERY_RECIPES.length && ['idle', 'running', 'no power', 'no feedstock', 'output full', 'disabled', 'wrecked', 'no deposit', 'depleted', 'target met', 'power reserved', 'delivery reserved', 'pressurizing', 'air low', 'breathable', 'power limited', 'research staffed', 'shield active', 'shield charging', 'shield breached'].includes(b.status))) return false;
  if (!number(colony.oxygenUsed) || !colony.buildings.every(b => isHabitat(b.kind) ? !!b.habitat && number(b.habitat.oxygen, 0, HABITATS[b.kind].capacity) && number(b.habitat.energy, 0, HABITATS[b.kind].power * HABITAT.backupSeconds) && typeof b.habitat.powered === 'boolean' && typeof b.habitat.backup === 'boolean' : b.habitat === undefined)) return false;
  if (!colony.buildings.every(b => b.schedule === undefined || b.kind === 'refinery' && validSchedule(b.schedule))) return false;
  if (new Set(colony.buildings.map(b => b.id)).size !== colony.buildings.length || !Number.isInteger(colony.nextId) || colony.nextId <= Math.max(0, ...colony.buildings.map(b => b.id))) return false;
  if (!PRODUCTS.every(p => number(colony.products[p], 0, productCapacity(colony))) || !number(colony.energy, 0, energyCapacity(colony)) || inventoryMass(world.depot) > oreCapacity(colony) + 1e-6) return false;
  const sample = template.asteroids[0];
  const pickupShape = { id: 1, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, radius: 1, mass: 1, resource: '' };
  if (world.asteroids.length > 256 || world.pickups.length > 256) return false;
  if (!world.asteroids.every(b => shape(sample, b) && [0, 1].includes(b.stage) && number(b.health, 0, 1) && number(b.maxHealth, 0.01, 1))) return false;
  if (!world.pickups.every(b => shape(pickupShape, b))) return false;
  const bodies = [...world.asteroids, ...world.pickups];
  if (!bodies.every(b => Number.isInteger(b.id) && b.id > 0 && number(b.mass, 1e-12, 1e6) && number(b.radius, 0.01, 200) && RESOURCES.includes(b.resource))) return false;
  if (new Set(bodies.map(b => b.id)).size !== bodies.length || !Number.isInteger(world.nextId) || world.nextId <= Math.max(0, ...bodies.map(b => b.id))) return false;
  if (world.beam !== null && (!object(world.beam) || !shape({ start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, world.beam))) return false;
  return validShields(world) && validExploration(world) && validCommand(world) && validTowing(world) && validGeology(world) && validCombat(world) && validDefence(world) && number(world.unloaded) && number(world.notice.time, 0, 3) && world.notice.message.length <= 500;
}
export function encodeCheckpoint(world: WorldState): string {
  if (!validWorld(world)) throw new Error('World state cannot be saved');
  return JSON.stringify({ version: 13, environment: { radius: WORLD.radius, model: 'atmospheric-flight-1' }, world });
}
export function decodeCheckpoint(text: string): WorldState {
  if (text.length > 1_000_000) throw new Error('Checkpoint is too large');
  const envelope: unknown = JSON.parse(text);
  if (!object(envelope) || envelope.version !== 13 || !object(envelope.world)) throw new Error('Checkpoint is incompatible with this development build · R starts a new world');
  if (!object(envelope.environment) || envelope.environment.radius !== WORLD.radius || envelope.environment.model !== 'atmospheric-flight-1') throw new Error('Checkpoint environment is incompatible');
  if (!validWorld(envelope.world)) throw new Error('Checkpoint is invalid');
  const world = envelope.world;
  world.combat.flashes = [];
  world.defence.controlled = null; world.defence.beams = [];
  world.buttons = { board: false, interact: false }; world.astronaut.jumpHeld = false; world.beam = null; world.tractorActive = false;
  world.notice = { message: 'CHECKPOINT LOADED · P TO RESUME', time: 3 };
  return world;
}
export function writeCheckpoint(storage: Pick<Storage, 'setItem'>, world: WorldState): void { storage.setItem(SAVE_KEY, encodeCheckpoint(world)); }
export function readCheckpoint(storage: Pick<Storage, 'getItem'>): WorldState | null {
  const text = storage.getItem(SAVE_KEY); return text === null ? null : decodeCheckpoint(text);
}
