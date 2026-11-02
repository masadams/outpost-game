import { createWorld, type WorldState } from '../sim/world';
import { BUILD_TYPES, PRODUCTS, REFINERY_RECIPES } from '../sim/colonyConfig';
import { energyCapacity, oreCapacity, productCapacity } from '../sim/colony';
import { CARGO_CAPACITY, inventoryMass, RESOURCES } from '../sim/resources';
import { WORLD } from '../sim/config';
import { SUIT } from '../sim/astronaut';

export const SAVE_KEY = 'outpost.checkpoint.v1';
type RecordValue = Record<string, unknown>;
const object = (value: unknown): value is RecordValue => value !== null && typeof value === 'object' && !Array.isArray(value);
const number = (value: unknown, min = 0, max = 1e9): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
function shape(template: unknown, value: unknown): boolean {
  if (typeof template === 'number') return number(value, -1e9);
  if (Array.isArray(template)) return Array.isArray(value);
  if (object(template)) return object(value) && Object.keys(template).every(key => shape(template[key], value[key]));
  return typeof template === typeof value;
}
function validWorld(value: unknown): value is WorldState {
  const template = createWorld();
  if (!object(value) || !shape(template, value)) return false;
  const world = value as unknown as WorldState;
  if (!['ship', 'astronaut'].includes(world.playerMode) || !['landed', 'flying', 'crashed'].includes(world.ship.state)) return false;
  if (!number(world.ship.fuel, 0, WORLD.fuelCapacity) || !number(world.ship.hull, 0, 100) || !number(world.astronaut.oxygen, 0, SUIT.oxygen + 1e-6) || !number(world.astronaut.health, 0, 100)) return false;
  if (!RESOURCES.every(r => number(world.depot[r]) && number(world.ship.cargo[r])) || inventoryMass(world.ship.cargo) > CARGO_CAPACITY + 1e-6) return false;
  const colony = world.colony;
  if (colony.buildings.length > 48 || !BUILD_TYPES.includes(colony.selected) || !number(colony.offset, -96, 96)) return false;
  const buildingShape = { id: 1, kind: '', angle: 0, enabled: true, progress: 0, recipe: 0, status: '' };
  if (!colony.buildings.every(b => shape(buildingShape, b) && Number.isInteger(b.id) && b.id > 0 && BUILD_TYPES.includes(b.kind) && number(b.angle, -Math.PI, Math.PI) &&
    number(b.progress, 0, 3) && Number.isInteger(b.recipe) && b.recipe >= 0 && b.recipe < REFINERY_RECIPES.length && ['idle', 'running', 'no power', 'no feedstock', 'output full', 'disabled'].includes(b.status))) return false;
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
  return number(world.unloaded) && number(world.notice.time, 0, 3) && world.notice.message.length <= 500;
}
export function encodeCheckpoint(world: WorldState): string {
  if (!validWorld(world)) throw new Error('World state cannot be saved');
  return JSON.stringify({ version: 1, world });
}
export function decodeCheckpoint(text: string): WorldState {
  if (text.length > 1_000_000) throw new Error('Checkpoint is too large');
  const envelope: unknown = JSON.parse(text);
  if (!object(envelope) || envelope.version !== 1 || !validWorld(envelope.world)) throw new Error('Checkpoint is invalid or uses an unsupported version');
  const world = envelope.world;
  world.buttons = { board: false, interact: false }; world.astronaut.jumpHeld = false; world.beam = null; world.tractorActive = false;
  world.notice = { message: 'CHECKPOINT LOADED · P TO RESUME', time: 3 };
  return world;
}
export function writeCheckpoint(storage: Pick<Storage, 'setItem'>, world: WorldState): void { storage.setItem(SAVE_KEY, encodeCheckpoint(world)); }
export function readCheckpoint(storage: Pick<Storage, 'getItem'>): WorldState | null {
  const text = storage.getItem(SAVE_KEY); return text === null ? null : decodeCheckpoint(text);
}
