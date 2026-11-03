import { equipped } from './shipStats';
import { createCombat, SHIP_WEAPONS, type CombatAction, type Drone } from './combatConfig';
import { createShip, telemetry } from './physics';
import { shipMass } from './shipMass';
import { heading, length, localAngle, wrap, type Vec } from './math';
import { WORLD } from './config';
import { inventoryMass } from './resources';
import { notify } from './messages';
import { availableProduct } from './colonyPolicy';
import { releaseTow } from './towing';
import { stepDrone } from './drones';
import { stepCombatProjectiles, type CombatStarts } from './combatProjectiles';
import { collideShip, type Asteroid } from './bodies';
import { droneMass } from './combatConfig';
import { lineOfSight } from './weapons';
import type { WorldState } from './world';

export const isCombatAction = (a: { type: string }): a is CombatAction => ['startEncounter', 'cycleWeapon', 'recoverShip'].includes(a.type);
export function threatTier(world: WorldState): number {
  return Math.min(3, 1 + Math.floor(world.unloaded / 40) + Math.floor(world.colony.buildings.filter(b => (b.health ?? 100) > 0).length / 6) + Math.floor(world.combat.furthestAltitude / 3000));
}
export function applyCombatAction(world: WorldState, action: CombatAction): void {
  const c = world.combat, s = world.ship;
  if (action.type === 'cycleWeapon') {
    s.armament.selected = s.armament.selected === 'cannon' ? 'missile' : 'cannon';
    notify(world, `${s.armament.selected.toUpperCase()} SELECTED · SHIFT TO FIRE`); return;
  }
  if (action.type === 'recoverShip') {
    if (s.state !== 'crashed') { notify(world, 'RECOVERY IS FOR A LOST SHIP · LAND AND E FOR SERVICE'); return; }
    const stock = world.colony.products;
    if (stock.alloy < 8 || stock.components < 2) { notify(world, 'RECOVERY NEEDS 8 ALLOY + 2 COMPONENTS · L LOADS CHECKPOINT · R RESETS'); return; }
    if (availableProduct(world.colony, 'alloy') < 8 || availableProduct(world.colony, 'components') < 2) { notify(world, 'RECOVERY MATERIALS RESERVED FOR TURRETS · LOWER RESERVES IN COLONY'); return; }
    stock.alloy -= 8; stock.components -= 2; c.lostCargo += inventoryMass(s.cargo); c.recoveries++;
    releaseTow(world, true);
    c.escaped += c.enemies.length; c.enemies = []; c.projectiles = []; c.flashes = [];
    const recovered = createShip(); recovered.hull = 30; recovered.fuel = Math.min(s.fuel, 20);
    recovered.armament = { ...s.armament, energy: 0, heat: 0, cooldown: 0, overheated: false }; recovered.towRig = s.towRig; recovered.equipment = [...s.equipment];
    world.ship = recovered; world.playerMode = 'ship'; world.astronaut.health = 100; world.astronaut.oxygen = 180; world.astronaut.position = { ...recovered.position }; world.astronaut.velocity = { x: 0, y: 0 }; world.astronaut.jumpHeld = false; world.astronaut.grounded = true;
    world.defence.controlled = null; world.colony.buildOpen = false; world.depotOpen = false;
    notify(world, 'RECOVERED AT HOME · CARGO LOST · HULL 30 · E USES SUPPLIES TO SERVICE'); return;
  }
  if (world.playerMode !== 'ship' || s.state !== 'flying' || telemetry(s).altitude < 200) { notify(world, 'LAUNCH ABOVE 200 m BEFORE STARTING A PATROL · SAVE WITH K FIRST'); return; }
  if (c.enemies.length || c.projectiles.length) { notify(world, 'FINISH OR DISENGAGE THE CURRENT PATROL FIRST'); return; }
  c.encounters++; c.tier = threatTier(world);
  for (let i = 0; i < c.tier; i++) {
    const n = heading(s.angle + (i === 0 ? 0 : i === 1 ? 0.55 : -0.55));
    let position = { x: s.position.x + n.x * (320 + i * 100), y: s.position.y + n.y * (320 + i * 100) };
    if (length(position) < WORLD.radius + 120) { const up = heading(localAngle(position)); position = { x: up.x * (WORLD.radius + 120), y: up.y * (WORLD.radius + 120) }; }
    c.enemies.push({ id: world.nextId++, position, velocity: { ...s.velocity }, angle: localAngle({ x: s.position.x - position.x, y: s.position.y - position.y }),
      hull: 48, fuel: 120, ammo: 24, energy: 50, cooldown: 0, windup: 0, retreatTime: 0, state: 'approach' });
  }
  notify(world, `PATROL ${c.tier} · SHIFT FIRE · Z WEAPON`);
}
function fireShip(world: WorldState): void {
  const s = world.ship, a = s.armament, spec = SHIP_WEAPONS[a.selected], c = world.combat;
  const boosted = a.selected === 'cannon' && equipped(s, 'coil'), energy = boosted ? 12 : spec.energy, heat = boosted ? 22 : spec.heat, damage = boosted ? 24 : spec.damage;
  if (world.playerMode !== 'ship' || s.state !== 'flying' || a.cooldown > 1e-9 || a.overheated || a.energy + 1e-9 < energy || a[a.selected] < 1 || c.projectiles.length >= 96) return;
  const n = heading(s.angle), at = { x: s.position.x + n.x * 13, y: s.position.y + n.y * 13 };
  const target = a.selected === 'missile' ? c.enemies.filter(d => d.hull > 0 && Math.hypot(d.position.x - at.x, d.position.y - at.y) < 1400 &&
    Math.abs(wrap(localAngle({ x: d.position.x - at.x, y: d.position.y - at.y }) - s.angle)) < 0.65 && lineOfSight(at, d.position)).sort((l, r) => Math.hypot(l.position.x - at.x, l.position.y - at.y) - Math.hypot(r.position.x - at.x, r.position.y - at.y))[0] : undefined;
  a[a.selected]--; a.energy = Math.max(0, a.energy - energy); a.heat = Math.min(100, a.heat + heat); a.cooldown = spec.interval;
  if (a.heat >= 100) a.overheated = true;
  c.shots++;
  c.projectiles.push({ id: world.nextId++, owner: 'ship', kind: a.selected, damage, position: at, velocity: { x: s.velocity.x + n.x * spec.speed, y: s.velocity.y + n.y * spec.speed }, life: spec.life, targetId: target?.id ?? null });
  const mass = shipMass(s); s.velocity.x -= n.x * spec.mass * spec.speed / mass; s.velocity.y -= n.y * spec.mass * spec.speed / mass;
}
export function stepCombat(world: WorldState, fire: boolean, dt: number, starts: Omit<CombatStarts, 'enemies'>): void {
  const c = world.combat, s = world.ship, a = s.armament;
  c.furthestAltitude = Math.max(c.furthestAltitude, telemetry(s).altitude);
  c.flashes = c.flashes.filter(f => (f.life -= dt) > 0);
  a.cooldown = Math.max(0, a.cooldown - dt); a.heat = Math.max(0, a.heat - (equipped(s, 'cooling') ? 30 : 20) * dt);
  if (a.overheated && a.heat <= 35) a.overheated = false;
  if (s.state !== 'crashed') a.energy = Math.min(100, a.energy + (equipped(s, 'cooling') ? 9 : 12) * dt);
  const enemyStarts = new Map(c.enemies.map(d => [d.id, { ...d.position }])), live: Drone[] = [];
  for (const d of c.enemies) {
    const old = enemyStarts.get(d.id)!, result = stepDrone(world, d, dt);
    if (result !== 'live') { c.escaped++; continue; }
    const proxy: Asteroid = { id: d.id, position: d.position, velocity: { ...d.velocity }, radius: 9, mass: droneMass(d), resource: 'rareMetals', stage: 0, health: 1, maxHealth: 1 };
    const hull = s.hull, speed = Math.hypot(s.velocity.x - d.velocity.x, s.velocity.y - d.velocity.y);
    collideShip(s, proxy, starts.ship, old);
    if (s.hull < hull) { d.velocity = proxy.velocity; d.hull = Math.max(0, d.hull - Math.max(4, speed * 4)); }
    live.push(d);
  }
  c.enemies = live;
  if (fire) fireShip(world);
  stepCombatProjectiles(world, dt, { ...starts, enemies: enemyStarts });
  const dead = c.enemies.filter(d => d.hull <= 0);
  for (const d of dead) { c.kills++; c.flashes.push({ position: { ...d.position }, life: 0.4 }); }
  c.enemies = c.enemies.filter(d => d.hull > 0); c.flashes = c.flashes.slice(-64);
}
export { createCombat };
