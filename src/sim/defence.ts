import { groundVelocity, nearestPlanet, planetAt, relative } from './celestial';
import { activeWorld } from './localWorld';
import { colonyPlanet, localAngleAt, sitePosition } from './localWorld';
import { ATMOSPHERE } from './config';
import { heading, wrap } from './math';
import { nearbyBuilding, type Building } from './colony';
import { operational } from './buildingHealth';
import { damageColony, repairBuilding } from './buildingDamage';
import { HEAVY_ROCK } from './weapons';
import { advanceMeteor, meteorDamage } from './meteor';
import { fracture } from './mining';
import { isTurret, type DefenceAction, type Meteor } from './defenceConfig';
import { stepWeapons, turretState } from './weapons';
import { notify } from './messages';
import type { WorldState } from './world';
import type { Vec } from './math';

export function controlledTurret(world: WorldState): Building | undefined {
  const b = world.colony.buildings.find(b => b.id === world.defence.controlled);
  if (nearestPlanet(world.astronaut.position, world.system).id !== colonyPlanet(world).id || !b || !isTurret(b.kind) || !b.enabled || !operational(b) || world.playerMode !== 'astronaut' || !world.astronaut.grounded || world.astronaut.health <= 0 || Math.abs(wrap(b.angle - localAngleAt(world, world.astronaut.position))) * colonyPlanet(world).radius > 18) {
    world.defence.controlled = null; return undefined;
  }
  return b;
}
export function applyDefenceAction(world: WorldState, action: DefenceAction): void {
  const d = world.defence;
  if (action.type === 'startWave') {
    if (d.meteors.length || d.projectiles.length) { notify(world, 'RESOLVE THE CURRENT DRILL BEFORE STARTING ANOTHER'); return; }
    if (world.astronaut.health <= 0 || world.ship.state === 'crashed') { notify(world, 'RECOVER BEFORE STARTING A DRILL · R RESETS'); return; }
    d.wave++;
    const target = [...world.colony.buildings].reverse().find(b => operational(b));
    const count = Math.min(3, d.wave);
    for (let i = 0; i < count; i++) {
      const angle = (target?.angle ?? 0) + (i - (count - 1) / 2) * 0.025, n = heading(angle);
      const radius = colonyPlanet(world).radius + ATMOSPHERE.height + 400 + i * 200;
      d.meteors.push({ id: world.nextId++, position: sitePosition(world, angle, radius - colonyPlanet(world).radius), velocity: { x: colonyPlanet(world).velocity.x - n.x * 115, y: colonyPlanet(world).velocity.y - n.y * 115 },
        radius: 14, mass: 1200, stage: 0, resource: 'iron', health: 1, maxHealth: 1 });
    }
    notify(world, `DEFENCE DRILL ${d.wave} · ${count} INCOMING · DAMAGE COUNTS · K SAVES`); return;
  }
  if (action.type === 'releaseTurret') { d.controlled = null; return; }
  if (world.playerMode !== 'astronaut' || !world.astronaut.grounded || world.astronaut.health <= 0) { notify(world, 'STAND BESIDE A FACILITY ON FOOT'); return; }
  if (action.type === 'repairBuilding') { repairBuilding(world); return; }
  const b = nearbyBuilding(world);
  if (!b || !isTurret(b.kind) || !operational(b) || !b.enabled) { notify(world, 'STAND WITHIN 18 m OF AN ENABLED TURRET'); return; }
  if (action.type === 'controlTurret') {
    d.controlled = d.controlled === b.id ? null : b.id; world.colony.buildOpen = false;
    notify(world, d.controlled === null ? 'TURRET RELEASED · WALKING CONTROLS' : 'TURRET CONTROL · A/D AIM · SPACE FIRE · E RELEASE');
  } else if (action.type === 'toggleAuto') {
    const state = turretState(b); state.automatic = !state.automatic;
    notify(world, state.automatic ? 'AUTOMATIC DEFENCE ON · USES GRID ENERGY AND AMMUNITION' : 'AUTOMATIC DEFENCE OFF');
  }
}
export const isDefenceAction = (action: { type: string }): action is DefenceAction => ['startWave', 'controlTurret', 'releaseTurret', 'toggleAuto', 'repairBuilding'].includes(action.type);
/** A meteor that is far from Selene and still moving away has missed for good. */
function hasPassed(m: Meteor, world: WorldState): boolean {
  const home = planetAt('home', world.system);
  const at = relative(m.position, home);
  const away = at.x * (m.velocity.x - home.velocity.x) + at.y * (m.velocity.y - home.velocity.y);
  return Math.hypot(at.x, at.y) > 16000 && away > 0;
}
export function stepDefence(world: WorldState, fire: boolean, turn: number, dt: number, shipStart: Vec): void {
  resolveDefenceHits(world);
  const d = world.defence, starts = new Map(d.meteors.map(m => [m.id, { ...m.position }]));
  const survivors: Meteor[] = [];
  for (const m of d.meteors) {
    const contact = advanceMeteor(m, dt, world, shipStart);
    if (m.health <= 0) { d.intercepted++; continue; }
    if (contact) {
      d.impacts++;
      damageColony(world, contact, meteorDamage(m, groundVelocity(nearestPlanet(contact, world.system), contact)), 65 + m.radius);
    } else if (hasPassed(m, world)) {
      // A body that missed and is heading back out to space is gone for good.
      continue;
    } else survivors.push(m);
  }
  d.meteors = survivors;
  controlledTurret(activeWorld(world));
  stepWeapons(world, fire, turn, dt, starts);
  resolveDefenceHits(world);
}

export function resolveDefenceHits(world: WorldState): void {
  const d = world.defence;
  const destroyed = d.meteors.filter(m => m.health <= 0);
  d.meteors = d.meteors.filter(m => m.health > 0);
  for (const m of destroyed) {
    d.intercepted++;
    if (m.radius >= HEAVY_ROCK.radius) {
      // A big rock does not vanish: it breaks into a few smaller ones, each still worth shooting.
      d.meteors.push(...breakUp(m, d.meteors.length, () => world.nextId++));
    } else if (m.lastHit === 'missile') {
      // A missile turns a small or medium rock to dust.
    } else if (m.stage === 0 && d.meteors.length <= 46) {
      const children: Meteor[] = fracture(m, () => world.nextId++).rocks;
      if (m.impactBudget !== undefined) children.forEach(child => { child.impactBudget = m.impactBudget! / 2; });
      d.meteors.push(...children);
    }
    // A second hit disperses fragments into non-collectible dust; impacts never create free ore.
  }
}

/** How a big rock breaks: into this many pieces, with toughness per metre of radius. */
export const BREAK_UP = { pieces: 3, giantPieces: 4, giant: 40, toughness: 0.12, spread: 4, limit: 48 } as const;

/** Breaks a big rock into three or four smaller ones, flung a little apart. */
export function breakUp(m: Meteor, count: number, nextId: () => number): Meteor[] {
  const n = Math.min(m.radius >= BREAK_UP.giant ? BREAK_UP.giantPieces : BREAK_UP.pieces, BREAK_UP.limit - count);
  if (n <= 0) return [];
  const radius = m.radius / Math.sqrt(n) * 1.1;
  const health = Math.round(radius * BREAK_UP.toughness * 100) / 100;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + m.id;
    const out = { x: Math.cos(a), y: Math.sin(a) };
    return {
      id: nextId(),
      position: { x: m.position.x + out.x * radius, y: m.position.y + out.y * radius },
      velocity: { x: m.velocity.x + out.x * BREAK_UP.spread, y: m.velocity.y + out.y * BREAK_UP.spread },
      radius,
      mass: m.mass / n,
      resource: m.resource,
      stage: 0,
      health,
      maxHealth: health,
      ...(m.impactBudget !== undefined ? { impactBudget: m.impactBudget / n } : {}),
    };
  });
}
