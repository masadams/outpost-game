import { HABITATS, isHabitat } from '../sim/habitatConfig';
import { habitatContains, habitatSource } from '../sim/habitats';
import { inventoryMass } from '../sim/resources';
import { heading } from '../sim/math';
import { WORLD } from '../sim/config';
import { flightSafety } from '../sim/flightSafety';
import { flightRegion } from '../sim/flightRegion';
import type { WorldState } from '../sim/world';

export type Cue = 'launch' | 'land' | 'impact' | 'crash' | 'fracture' | 'pickup' | 'delivery' | 'build' | 'demolish' | 'airlock' | 'jump' | 'step' | 'service' | 'refuel' | 'production' | 'warning' | 'shot' | 'landingWarning' | 'fuelWarning' | 'towLatch' | 'towRelease' | 'towSnap' | 'atmosphereExit' | 'atmosphereEntry';
export interface SoundFrame { cues: Cue[]; engine: boolean; mining: boolean; tractor: boolean; machinery: boolean }
const silent = (): SoundFrame => ({ cues: [], engine: false, mining: false, tractor: false, machinery: false });
function snapshot(world: WorldState) {
  return { habitat: !!habitatSource(world), space: flightRegion(world.ship.position) === 'space', towRig: world.ship.towRig, towTarget: world.towing.targetId, towBreaks: world.towing.breaks, combatKills: world.combat.kills, threats: world.defence.meteors.length + world.combat.enemies.length, shots: world.defence.shots + world.combat.shots + world.combat.enemyShots, impacts: world.defence.impacts,
    buildingHull: world.colony.buildings.reduce((sum, b) => sum + (b.health ?? 100), 0), mode: world.playerMode, state: world.ship.state, hull: world.ship.hull, fuel: world.ship.fuel,
    grounded: world.astronaut.grounded, suitHealth: world.astronaut.health, oxygen: world.astronaut.oxygen,
    position: { ...world.astronaut.position }, cargo: inventoryMass(world.ship.cargo), unloaded: world.unloaded,
    rocks: new Map(world.asteroids.map(b => [b.id, { ...b.position }])),
    buildings: new Map(world.colony.buildings.map(b => [b.id, { progress: b.progress, recipe: b.recipe }])) };
}
export class AudioDirector {
  private previous: ReturnType<typeof snapshot> | null = null;
  private footDistance = 0;
  private alarmTime = 0;
  private lastAlarm = new Map<string, number>();
  private regionCooldown = 0;
  reset(world: WorldState): void { this.previous = snapshot(world); this.footDistance = 0; this.alarmTime = 0; this.lastAlarm.clear(); this.regionCooldown = 0; }
  update(world: WorldState, seconds: number, paused: boolean): SoundFrame {
    const next = snapshot(world), prev = this.previous; this.previous = next;
    if (!prev || paused) { this.footDistance = 0; return silent(); }
    const onFoot = world.playerMode === 'astronaut', alive = onFoot ? next.suitHealth > 0 : next.state !== 'crashed';
    const viewer = onFoot ? world.astronaut.position : world.ship.position;
    const near = (x: number, y: number, range: number) => Math.hypot(viewer.x - x, viewer.y - y) <= range;
    const cues: Cue[] = [];
    this.regionCooldown = Math.max(0, this.regionCooldown - Math.max(0, seconds));
    if (!onFoot && prev.mode === 'ship' && next.state === 'flying' && prev.state === 'flying' && next.space !== prev.space && this.regionCooldown <= 1e-9) {
      cues.push(next.space ? 'atmosphereExit' : 'atmosphereEntry'); this.regionCooldown = 6;
    }
    if (next.towRig && !prev.towRig) cues.push('build');
    if (next.towTarget !== null && next.towTarget !== prev.towTarget) cues.push('towLatch');
    if (next.towBreaks > prev.towBreaks) cues.push('towSnap');
    else if (prev.towTarget !== null && next.towTarget === null) cues.push('towRelease');
    if ((next.state === 'crashed' && prev.state !== 'crashed') || (next.suitHealth === 0 && prev.suitHealth > 0)) cues.push('crash');
    else if (next.hull < prev.hull || next.suitHealth < prev.suitHealth - 1) cues.push('impact');
    if (next.shots > prev.shots) cues.push('shot');
    if (next.combatKills > prev.combatKills) cues.push('fracture');
    if (next.impacts > prev.impacts || (next.buildingHull < prev.buildingHull && next.buildings.size === prev.buildings.size)) cues.push('impact');
    if (prev.state === 'landed' && next.state === 'flying') cues.push('launch');
    if (prev.state === 'flying' && next.state === 'landed') cues.push('land');
    if (onFoot && prev.mode === 'astronaut' && prev.habitat !== next.habitat) cues.push('airlock');
    if (prev.mode !== next.mode) { cues.push('airlock'); this.footDistance = 0; }
    else if (onFoot && alive) {
      if (prev.grounded && !next.grounded) cues.push('jump');
      if (!prev.grounded && next.grounded) cues.push('step');
      if (prev.grounded && next.grounded) {
        this.footDistance += Math.hypot(next.position.x - prev.position.x, next.position.y - prev.position.y);
        if (this.footDistance >= 4) { cues.push('step'); this.footDistance %= 4; }
      } else this.footDistance = 0;
      if (next.oxygen > prev.oxygen + 1 || next.suitHealth > prev.suitHealth) cues.push('service');
    }
    if (next.cargo > prev.cargo + 1e-6) cues.push('pickup');
    if (next.unloaded > prev.unloaded) cues.push('delivery');
    if (next.fuel > prev.fuel + 1e-6) cues.push('refuel');
    if (Array.from(prev.rocks).some(([id, p]) => !next.rocks.has(id) && near(p.x, p.y, 650))) cues.push('fracture');
    const added = Array.from(next.buildings.keys()).some(id => !prev.buildings.has(id));
    const removed = Array.from(prev.buildings.keys()).some(id => !next.buildings.has(id));
    if (added) cues.push('build'); if (removed) cues.push('demolish');
    const machinery = world.colony.buildings.some(b => {
      const n = heading(b.angle); return b.status === 'running' && near(n.x * WORLD.radius, n.y * WORLD.radius, 150);
    });
    if (!added && !removed && machinery && world.colony.buildings.some(b => {
      const old = prev.buildings.get(b.id), n = heading(b.angle);
      return old && old.recipe === b.recipe && b.progress < old.progress && b.status === 'running' && near(n.x * WORLD.radius, n.y * WORLD.radius, 150);
    })) cues.push('production');
    const safety = flightSafety(world.ship), fuelLevel = safety.instruments.fuel.level;
    const landing = alive && !onFoot && safety.urgent, fuel = alive && !onFoot && next.state === 'flying' && (fuelLevel === 'caution' || fuelLevel === 'critical');
    const generic = alive && (next.threats > 0 || (onFoot ? (!next.habitat && next.oxygen < 30) || world.colony.buildings.some(b => isHabitat(b.kind) && b.habitat?.powered && habitatContains(b, world.astronaut.position) && (b.status === 'air low' || b.habitat.backup && b.habitat.energy / HABITATS[b.kind].power <= 3)) : next.state === 'flying' && next.hull < 25));
    const fuelFirst = fuel && (fuelLevel === 'critical' || !generic);
    const key = landing ? 'landing' : fuelFirst ? `fuel-${fuelLevel}` : generic ? 'generic' : '';
    this.alarmTime += Math.max(0, seconds);
    const interval = landing ? 2.5 : fuelFirst && fuelLevel === 'critical' ? 4 : 8, last = this.lastAlarm.get(key);
    if (key && (last === undefined || this.alarmTime - last + 1e-9 >= interval)) {
      cues.push(landing ? 'landingWarning' : fuelFirst ? 'fuelWarning' : 'warning'); this.lastAlarm.set(key, this.alarmTime);
    }
    return { cues, engine: alive && !onFoot && world.ship.thrusting,
      mining: alive && !!world.beam, tractor: alive && world.tractorActive, machinery: alive && machinery };
  }
}
