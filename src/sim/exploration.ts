import { BODY_IDS, type BodyId, groundVelocity, planetAt, surfacePosition, clearTerrain, nearestPlanet, relative as bodyRelative } from './celestial';
import { cargoMass } from './shipMass';
import { fuelCapacity, cargoCapacity } from './shipStats';
import { moveBody, separateBodies, collideShip } from './bodies';
import { BELTS, BELT_IDS, SITE_IDS, SITE_INFO, EXPLORATION, DESTINATIONS, type Site, type Destination } from './explorationConfig';
import { WORLD } from './config';
import { emptyInventory, inventoryMass, RESOURCES } from './resources';
import { heading, length, dot, wrap, localAngle, type Vec } from './math';
import { shipMass } from './shipMass';
import { around, streamFor } from './seed';
import { launchProbe } from './probes';
import { notify } from './messages';
import type { ExplorationAction } from './explorationConfig';
import type { WorldState } from './world';
/** A circular orbit around a body at the start of the game, at a height above its surface and an angle around it. */
export function orbitalState(altitude: number, angle: number, around: BodyId = 'home', seed = 0) {
  const planet = planetAt(around, { time: 0, binary: true, ...(seed !== 0 ? { seed } : {}) });
  const n = heading(angle), radius = planet.radius + altitude, speed = Math.sqrt(planet.mu / radius);
  return {
    position: { x: planet.position.x + n.x * radius, y: planet.position.y + n.y * radius },
    velocity: { x: planet.velocity.x - n.y * speed, y: planet.velocity.y + n.x * speed },
  };
}
/** Only new worlds / legacy migration call this; runtime and v11 loads never reseed. */
export function seedNeighborhood(w: WorldState): void {
  if (w.exploration.sites.length) return;
  for (const belt of w.asteroids.length + 12 <= 256 ? BELT_IDS : []) {
    const spec = BELTS[belt];
    const rand = streamFor(w.seed, `belt/${belt}`);
    for (let i = 0; i < EXPLORATION.rocksPerBelt; i++) {
      const size = w.seed === 0 ? 1 : around(rand, 0.15);
      const state = orbitalState(spec.altitude + (i % 2 ? 40 : -40), spec.angle + (i - 1.5) * spec.step, spec.around, w.seed);
      w.asteroids.push({ ...state, id: w.nextId++, belt, resource: spec.resources[i], radius: Math.round((14 + i * 2) * size * 10) / 10, mass: Math.round((36 + i * 8) * size * size), stage: 0, health: 1, maxHealth: 1 });
    }
  }
  for (const key of SITE_IDS) {
    const spec = BELTS[SITE_INFO[key].belt], stock = emptyInventory(), fuel = key === 'tender' ? 18 : 0;
    if (key === 'cache') { stock.copper = 12; stock.rareMetals = 6; }
    w.exploration.sites.push({ ...orbitalState(spec.altitude, spec.angle, spec.around, w.seed), id: w.nextId++, key, stock, fuel, radius: EXPLORATION.siteRadius, mass: EXPLORATION.dryMass + inventoryMass(stock) + fuel, resource: 'iron', stage: 0, health: 1, maxHealth: 1 });
  }
}
/** How far from the home planet's centre a point can be marked (m). */
export const MARK_LIMIT = 30000;

export function destination(w: WorldState, key = w.exploration.selected): { label: string; position: Vec; velocity: Vec; site?: Site } {
  if ((BODY_IDS as readonly string[]).includes(key)) { const p = planetAt(key as BodyId, w.system); return { label: key === 'home' ? 'Home pad' : key === 'moon' ? 'Nacre moon pad · airless' : `${p.label} pad · airless`, position: surfacePosition(p, 0, WORLD.shipRadius), velocity: groundVelocity(p, surfacePosition(p, 0, WORLD.shipRadius)) }; }
  if (key === 'mark') {
    const at = w.exploration.mark ?? { x: 0, y: 0 };
    return { label: 'Marked point', position: at, velocity: { x: 0, y: 0 } };
  }
  const site = w.exploration.sites.find(s => s.key === key);
  if (site) return { label: SITE_INFO[site.key].label, position: site.position, velocity: site.velocity, site };
  const belt = BELT_IDS.find(b => b === key);
  if (belt) {
    const bodies = [...w.asteroids, ...w.pickups].filter(b => b.belt === belt), mass = bodies.reduce((sum, b) => sum + b.mass, 0);
    const beacon = w.exploration.sites.find(s => SITE_INFO[s.key].belt === belt);
    if (!mass && beacon) return { label: BELTS[belt].label, position: beacon.position, velocity: beacon.velocity };
    const mean = (field: 'position' | 'velocity') => ({ x: bodies.reduce((sum, b) => sum + b[field].x * b.mass, 0) / mass, y: bodies.reduce((sum, b) => sum + b[field].y * b.mass, 0) / mass });
    if (mass) return { label: BELTS[belt].label, position: mean('position'), velocity: mean('velocity') };
    return { label: BELTS[belt].label, ...orbitalState(BELTS[belt].altitude, BELTS[belt].angle, BELTS[belt].around, w.seed) };
  }
  return destination(w, 'home');
}
export function navigation(w: WorldState, key?: Destination) {
  const target = destination(w, key), viewer = w.playerMode === 'ship' ? w.ship : w.astronaut;
  const delta = { x: target.position.x - viewer.position.x, y: target.position.y - viewer.position.y }, range = length(delta);
  const relative = { x: viewer.velocity.x - target.velocity.x, y: viewer.velocity.y - target.velocity.y };
  const direction = range > 1e-9 ? { x: delta.x / range, y: delta.y / range } : { x: 0, y: 0 };
  return { ...target, range, relativeSpeed: length(relative), closing: dot(relative, direction), bearing: range < 1e-9 ? 0 : wrap(localAngle(delta) - (w.playerMode === 'ship' ? w.ship.angle : localAngle(bodyRelative(viewer.position, nearestPlanet(viewer.position, w.system))))), occluded: !clearTerrain(viewer.position, target.position, w.system) };
}
export function siteError(w: WorldState, site: Site): string | null {
  if (w.playerMode !== 'ship' || w.ship.state !== 'flying') return 'Pilot a flying ship to rendezvous';
  if (site.health <= 0) return 'Site wrecked · supplies lost or released';
  const n = navigation(w, site.key);
  if (n.range > EXPLORATION.range) return 'Approach within 120 m';
  if (n.relativeSpeed > EXPLORATION.relativeSpeed) return 'Match relative speed to 8 m/s or less';
  if (n.occluded) return 'Planet blocks contact';
  return null;
}
export function applyExplorationAction(w: WorldState, a: ExplorationAction): void {
  if (a.type === 'mark') {
    const { x, y } = a.point;
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) > MARK_LIMIT) return;
    w.exploration.mark = { x, y };
    w.exploration.selected = 'mark';
    return;
  }
  if (a.type === 'navigate') { if (DESTINATIONS.includes(a.target)) w.exploration.selected = a.target; return; }
  const site = destination(w).site;
  if (!site) {
    if ((BELT_IDS as readonly string[]).includes(w.exploration.selected) || w.exploration.selected === 'mark') launchProbe(w);
    else notify(w, 'SELECT A SURVEY, SALVAGE OR FUEL SITE IN NAVIGATION');
    return;
  }
  const error = siteError(w, site); if (error) { notify(w, error); return; }
  const belt = SITE_INFO[site.key].belt;
  if (!w.exploration.surveyed.includes(belt)) w.exploration.surveyed.push(belt);
  if (site.key === 'cache') {
    let accepted = 0;
    for (const r of RESOURCES) {
      const amount = Math.min(site.stock[r], cargoCapacity(w.ship) - cargoMass(w.ship)); if (amount <= 0) continue;
      transferMomentum(w, site, amount); w.ship.cargo[r] += amount; site.stock[r] -= amount; accepted += amount;
    }
    w.exploration.salvaged += accepted; notify(w, accepted ? `SALVAGE +${accepted.toFixed(1)} kg · RETURN AND UNLOAD AT HOME` : inventoryMass(site.stock) ? 'HOLD FULL · UNLOAD BEFORE RECOVERING MORE' : 'CACHE EMPTY · NO RESPAWN');
  } else if (site.key === 'tender') {
    const amount = Math.min(site.fuel, fuelCapacity(w.ship) - w.ship.fuel);
    transferMomentum(w, site, amount); w.ship.fuel += amount; site.fuel = Math.max(0, site.fuel - amount); w.exploration.refuelled += amount;
    notify(w, amount ? `TENDER TRANSFER +${amount.toFixed(1)} kg FUEL · FINITE STOCK` : site.fuel ? 'SHIP TANK FULL' : 'TENDER EMPTY · NO RESUPPLY');
  } else notify(w, 'FROST ARC SURVEYED · LIVE ORE MANIFEST REVEALED');
  site.mass = EXPLORATION.dryMass + inventoryMass(site.stock) + site.fuel;
}
function transferMomentum(w: WorldState, site: Site, amount: number): void {
  const mass = shipMass(w.ship);
  w.ship.velocity = { x: (w.ship.velocity.x * mass + site.velocity.x * amount) / (mass + amount), y: (w.ship.velocity.y * mass + site.velocity.y * amount) / (mass + amount) };
}
export function stepSites(w: WorldState, dt: number, shipStart: Vec): void {
  const starts = new Map(w.exploration.sites.map(s => [s.id, { ...s.position }]));
  for (const s of w.exploration.sites) moveBody(s, dt, w.system);
  for (let i = 0; i < w.exploration.sites.length; i++) {
    const s = w.exploration.sites[i]; for (const rock of w.asteroids) separateBodies(s, rock);
    for (let j = i + 1; j < w.exploration.sites.length; j++) separateBodies(s, w.exploration.sites[j]);
    collideShip(w.ship, s, shipStart, starts.get(s.id)!);
  }
}
export function resolveSites(w: WorldState): void {
  for (const s of w.exploration.sites) if (s.health <= 0) {
    s.health = 0;
    for (const r of RESOURCES) if (s.stock[r] > 0) {
      w.pickups.push({ id: w.nextId++, resource: r, position: { ...s.position }, velocity: { ...s.velocity }, mass: s.stock[r], radius: 2 }); s.stock[r] = 0;
    }
    w.exploration.fuelLost += s.fuel; s.fuel = 0; s.mass = EXPLORATION.dryMass;
  }
}
