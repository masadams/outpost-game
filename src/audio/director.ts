import { inventoryMass } from '../sim/resources';
import { heading } from '../sim/math';
import { WORLD } from '../sim/config';
import type { WorldState } from '../sim/world';

export type Cue = 'launch' | 'land' | 'impact' | 'crash' | 'fracture' | 'pickup' | 'delivery' | 'build' | 'demolish' | 'airlock' | 'jump' | 'step' | 'service' | 'refuel' | 'production' | 'warning' | 'shot';
export interface SoundFrame { cues: Cue[]; engine: boolean; mining: boolean; tractor: boolean; machinery: boolean }
const silent = (): SoundFrame => ({ cues: [], engine: false, mining: false, tractor: false, machinery: false });
function snapshot(world: WorldState) {
  return { threats: world.defence.meteors.length, shots: world.defence.shots, impacts: world.defence.impacts,
    buildingHull: world.colony.buildings.reduce((sum, b) => sum + (b.health ?? 100), 0), mode: world.playerMode, state: world.ship.state, hull: world.ship.hull, fuel: world.ship.fuel,
    grounded: world.astronaut.grounded, suitHealth: world.astronaut.health, oxygen: world.astronaut.oxygen,
    position: { ...world.astronaut.position }, cargo: inventoryMass(world.ship.cargo), unloaded: world.unloaded,
    rocks: new Map(world.asteroids.map(b => [b.id, { ...b.position }])),
    buildings: new Map(world.colony.buildings.map(b => [b.id, { progress: b.progress, recipe: b.recipe }])) };
}
export class AudioDirector {
  private previous: ReturnType<typeof snapshot> | null = null;
  private footDistance = 0;
  private warningCooldown = 0;
  reset(world: WorldState): void { this.previous = snapshot(world); this.footDistance = 0; this.warningCooldown = 0; }
  update(world: WorldState, seconds: number, paused: boolean): SoundFrame {
    const next = snapshot(world), prev = this.previous; this.previous = next;
    if (!prev || paused) { this.footDistance = 0; return silent(); }
    const onFoot = world.playerMode === 'astronaut', alive = onFoot ? next.suitHealth > 0 : next.state !== 'crashed';
    const viewer = onFoot ? world.astronaut.position : world.ship.position;
    const near = (x: number, y: number, range: number) => Math.hypot(viewer.x - x, viewer.y - y) <= range;
    const cues: Cue[] = [];
    if ((next.state === 'crashed' && prev.state !== 'crashed') || (next.suitHealth === 0 && prev.suitHealth > 0)) cues.push('crash');
    else if (next.hull < prev.hull || next.suitHealth < prev.suitHealth - 1) cues.push('impact');
    if (next.shots > prev.shots) cues.push('shot');
    if (next.impacts > prev.impacts || (next.buildingHull < prev.buildingHull && next.buildings.size === prev.buildings.size)) cues.push('impact');
    if (prev.state === 'landed' && next.state === 'flying') cues.push('launch');
    if (prev.state === 'flying' && next.state === 'landed') cues.push('land');
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
    const warning = alive && (next.threats > 0 || (onFoot ? next.oxygen < 30 : next.state === 'flying' && (next.fuel < WORLD.fuelCapacity * 0.15 || next.hull < 25)));
    this.warningCooldown = warning ? Math.max(0, this.warningCooldown - Math.max(0, seconds)) : 0;
    if (warning && this.warningCooldown === 0) { cues.push('warning'); this.warningCooldown = 8; }
    return { cues, engine: alive && !onFoot && world.ship.thrusting,
      mining: alive && !!world.beam, tractor: alive && world.tractorActive, machinery: alive && machinery };
  }
}
