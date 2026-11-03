import { orderedBuildings, powerFraction } from './power';
import { HABITAT, HABITATS, isHabitat } from './habitatConfig';
import { operational, buildingHealth } from './buildingHealth';
import { policyFor } from './colonyPolicy';
import { WORLD } from './config';
import { SUIT } from './astronaut';
import { length, localAngle, wrap } from './math';
import type { Building } from './colony';
import type { WorldState } from './world';

export function habitatContains(building: Building, position: { x: number; y: number }): boolean {
  if (!isHabitat(building.kind)) return false;
  const spec = HABITATS[building.kind], arc = Math.abs(wrap(localAngle(position) - building.angle)) * WORLD.radius;
  if (arc + SUIT.radius > spec.halfSpan + 1e-7) return false;
  // Conservative bounding box keeps the entire suit below even the lower, outer roof edge.
  const ceiling = spec.height * Math.sqrt(Math.max(0, 1 - ((arc + SUIT.radius) / spec.halfSpan) ** 2));
  return length(position) - WORLD.radius + SUIT.radius <= ceiling + 1e-7;
}
export function habitatBreathable(b: Building): boolean {
  return isHabitat(b.kind) && operational(b) && b.enabled && !!b.habitat?.powered && b.habitat.oxygen > HABITATS[b.kind].capacity * HABITAT.minimumFraction + 1e-9;
}
export function habitatSource(w: WorldState): Building | undefined {
  if (w.playerMode !== 'astronaut' || w.astronaut.health <= 0) return undefined;
  return w.colony.buildings.filter(b => habitatBreathable(b) && habitatContains(b, w.astronaut.position)).sort((a, b) => a.id - b.id)[0];
}
/** Sample coverage at the beginning of the fixed step and pay for only one crew's air. */
export function consumeHabitatAir(w: WorldState, dt: number): number {
  const b = habitatSource(w); if (!b || !isHabitat(b.kind) || !b.habitat) return 0;
  const available = Math.max(0, b.habitat.oxygen - HABITATS[b.kind].capacity * HABITAT.minimumFraction);
  const used = Math.min(available, HABITAT.crewRate * dt);
  b.habitat.oxygen = Math.max(0, b.habitat.oxygen - used); w.colony.oxygenUsed += used;
  return used / HABITAT.crewRate;
}
export function ventHabitat(w: WorldState, b: Building): void {
  if (!b.habitat) return;
  w.colony.oxygenUsed += b.habitat.oxygen;
  b.habitat.oxygen = 0; b.habitat.energy = 0; b.habitat.powered = false; b.habitat.backup = false;
}
/** Essential life support runs before industry and may draw protected charge. Backup charging may not. */
export function stepHabitats(w: WorldState, dt: number, deferCharging = false): void {
  const c = w.colony;
  for (const b of orderedBuildings(c)) {
    if (!isHabitat(b.kind) || !b.habitat) continue;
    const spec = HABITATS[b.kind], h = b.habitat;
    h.powered = false; h.backup = false;
    if (!operational(b)) { ventHabitat(w, b); b.status = 'wrecked'; continue; }
    const leak = Math.min(h.oxygen, spec.leakRate * (1 + (100 - buildingHealth(b)) / 25) * dt);
    h.oxygen -= leak; c.oxygenUsed += leak;
    if (!b.enabled) { b.status = 'disabled'; continue; }
    c.demand += spec.power;
    const required = spec.power * dt, allowed = required * powerFraction(b); b.requestedPower = spec.power;
    if (Math.min(c.energy, allowed) + h.energy + 1e-9 < required) { b.status = 'no power'; continue; }
    const grid = Math.min(c.energy, allowed), backup = required - grid;
    c.energy = Math.max(0, c.energy - grid); h.energy = Math.max(0, h.energy - backup);
    b.gridPower = grid / dt; h.powered = true; h.backup = backup > 1e-9;
    const fill = Math.min(spec.capacity - h.oxygen, c.products.oxygen, spec.fillRate * dt);
    h.oxygen += fill; c.products.oxygen = Math.max(0, c.products.oxygen - fill);
    b.status = h.oxygen <= spec.capacity * HABITAT.minimumFraction + 1e-9 ? c.products.oxygen <= 1e-9 ? 'no feedstock' : 'pressurizing' :
      h.oxygen < spec.capacity * HABITAT.warningFraction ? 'air low' : 'breathable';
  }
  if (!deferCharging) chargeHabitats(w, dt);
}
export function chargeHabitats(w: WorldState, dt: number): void {
  const c = w.colony;
  // Fund every dome's essential load before spending spare grid energy on backup charging.
  for (const b of orderedBuildings(c)) {
    if (!isHabitat(b.kind) || !b.habitat?.powered || powerFraction(b) < 1) continue;
    const spec = HABITATS[b.kind], h = b.habitat;
    const charge = Math.max(0, Math.min(spec.power * dt, spec.power * HABITAT.backupSeconds - h.energy, c.energy - policyFor(c).energyReserve));
    if (h.energy < spec.power * HABITAT.backupSeconds - 1e-9) { c.demand += spec.power; b.requestedPower = (b.requestedPower ?? 0) + spec.power; }
    b.gridPower = (b.gridPower ?? 0) + charge / dt; h.energy += charge; c.energy = Math.max(0, c.energy - charge);
  }
}
