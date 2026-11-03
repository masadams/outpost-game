import { nearestPlanet } from './celestial';
import { activeWorld } from './localWorld';
import { colonyPlanet, localAngleAt, sitePosition } from './localWorld';
import { ATMOSPHERE } from './config';
import { heading, wrap } from './math';
import { nearbyBuilding, type Building } from './colony';
import { operational } from './buildingHealth';
import { damageColony, repairBuilding } from './buildingDamage';
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
    notify(world, `DEFENCE DRILL ${d.wave} · ${count} INCOMING · DAMAGE IS REAL · K SAVES`); return;
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
export function stepDefence(world: WorldState, fire: boolean, turn: number, dt: number, shipStart: Vec): void {
  resolveDefenceHits(world);
  const d = world.defence, starts = new Map(d.meteors.map(m => [m.id, { ...m.position }]));
  const survivors: Meteor[] = [];
  for (const m of d.meteors) {
    const contact = advanceMeteor(m, dt, world, shipStart);
    if (m.health <= 0) { d.intercepted++; continue; }
    if (contact) {
      d.impacts++;
      damageColony(world, contact, meteorDamage(m, nearestPlanet(contact, world.system).velocity), 65 + m.radius);
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
    if (m.stage === 0 && d.meteors.length <= 46) {
      const children: Meteor[] = fracture(m, () => world.nextId++).rocks;
      if (m.impactBudget !== undefined) children.forEach(child => { child.impactBudget = m.impactBudget! / 2; });
      d.meteors.push(...children);
    }
    // A second hit disperses fragments into non-collectible dust; impacts never create free ore.
  }
}
