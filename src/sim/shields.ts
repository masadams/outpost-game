import { workFactor } from './facilityStats';
import { groundVelocity, planetAt, surfacePosition } from './celestial';
import { allColonies, colonyPlanet } from './localWorld';
import { SHIELDS, SHIELD, isShield } from './shieldConfig';
import { operational } from './buildingHealth';
import { orderedBuildings, powerFraction } from './power';
import { policyFor } from './colonyPolicy';
import { type Vec } from './math';
import { surfaceHit } from './physics';
import type { Building } from './colony';
import type { WorldState } from './world';

export function shieldActive(b: Building): boolean {
  return isShield(b.kind) && operational(b) && b.enabled && !!b.shield?.powered && b.shield.ready && b.shield.charge > 1e-9;
}
export function drainShield(w: WorldState, b: Building): void {
  if (!b.shield) return;
  w.colony.shielding.lostCharge += b.shield.charge;
  Object.assign(b.shield, { charge: 0, powered: false, ready: false });
}
/** Life support has first claim. Shield maintenance may use protected energy; charging may not. */
export function maintainShields(w: WorldState, dt: number): void {
  const c = w.colony;
  for (const b of orderedBuildings(c)) {
    if (!isShield(b.kind) || !b.shield) continue;
    const h = b.shield, spec = SHIELDS[b.kind];
    h.powered = false; h.delay = Math.max(0, h.delay - dt); h.recovery = Math.max(0, h.recovery - dt); h.flash = Math.max(0, h.flash - dt);
    if (!operational(b)) { drainShield(w, b); b.status = 'wrecked'; continue; }
    if (!b.enabled) { b.status = 'disabled'; continue; }
    c.demand += spec.upkeep; b.requestedPower = spec.upkeep;
    if (powerFraction(b) * (spec.upkeep + spec.recharge) + 1e-9 < spec.upkeep) { b.status = 'power limited'; continue; }
    const cost = spec.upkeep * dt;
    if (c.energy + 1e-9 < cost) { b.status = 'no power'; continue; }
    c.energy = Math.max(0, c.energy - cost); c.shielding.energyUsed += cost; b.gridPower = spec.upkeep; h.powered = true;
    b.status = h.ready && h.charge > 1e-9 ? 'shield active' : h.recovery > 1e-9 ? 'shield breached' : 'shield charging';
  }
}
export function chargeShields(w: WorldState, dt: number): void {
  const c = w.colony;
  for (const b of orderedBuildings(c)) {
    if (!isShield(b.kind) || !b.shield?.powered) continue;
    const h = b.shield, spec = SHIELDS[b.kind];
    if (h.delay <= 1e-9 && h.charge < spec.capacity) {
      const rate = Math.max(0, Math.min(spec.recharge * workFactor(b), powerFraction(b) * (spec.upkeep + spec.recharge * workFactor(b)) - spec.upkeep));
      const charge = Math.max(0, Math.min(rate * dt, spec.capacity - h.charge, c.energy - policyFor(c).energyReserve));
      c.demand += rate; b.requestedPower = spec.upkeep + rate;
      c.energy = Math.max(0, c.energy - charge); h.charge += charge; c.shielding.energyUsed += charge; b.gridPower = spec.upkeep + charge / dt;
    }
    if (!h.ready && h.recovery <= 1e-9 && h.charge + 1e-9 >= spec.capacity * SHIELD.rearmFraction) h.ready = true;
    b.status = h.ready ? 'shield active' : h.recovery > 1e-9 ? 'shield breached' : 'shield charging';
  }
}
export interface ShieldHit { building: Building; t: number; site?: WorldState; velocity?: Vec }
/** Only outside-to-inside crossings count. Traffic and threats already inside are unaffected. */
export function firstShieldHit(w: WorldState, start: Vec, end: Vec, radius: number, before = 1, dt = 0, elapsed = 0): ShieldHit | null {
  let best: ShieldHit | null = null;
  for (const site of allColonies(w)) for (const b of site.colony.buildings) {
    if (!shieldActive(b) || !isShield(b.kind)) continue;
    const planet = colonyPlanet(site), first = planetAt(planet.id, { ...w.system, time: w.system.time + elapsed * dt }), last = planetAt(planet.id, { ...w.system, time: w.system.time + dt });
    const centre = surfacePosition(first, b.angle), next = surfacePosition(last, b.angle);
    const a = { x: start.x - centre.x, y: start.y - centre.y }, z = { x: end.x - next.x, y: end.y - next.y }, r = SHIELDS[b.kind].radius + radius;
    if (a.x * a.x + a.y * a.y < r * r - 1e-7 || a.x * (z.x - a.x) + a.y * (z.y - a.y) >= 0) continue;
    const t = surfaceHit(a, z, r);
    if (t === null || t >= before || best && (t > best.t + 1e-10 || Math.abs(t - best.t) <= 1e-10 && b.id > best.building.id)) continue;
    best = { building: b, t, site, velocity: groundVelocity(planet, centre) };
  }
  return best;
}
/** Returns the residual damage fraction; removed kinetic energy is explicitly dissipated. */
export function absorbShield(w: WorldState, hit: ShieldHit, damage: number, velocity: Vec, mass: number): number {
  const h = hit.building.shield!, ledger = (hit.site ?? w).colony.shielding;
  const paid = Math.min(h.charge, damage), fraction = Math.max(0, (damage - paid) / damage);
  h.charge = Math.max(0, h.charge - paid); h.delay = SHIELD.delay; h.flash = .25;
  ledger.hits++; ledger.absorbed += paid;
  ledger.dissipatedEnergy += mass * ((velocity.x - (hit.velocity?.x ?? 0)) ** 2 + (velocity.y - (hit.velocity?.y ?? 0)) ** 2) / 2 * (1 - fraction);
  if (fraction <= 1e-9) ledger.dustMass += mass;
  if (h.charge <= 1e-9) { h.charge = 0; h.ready = false; h.recovery = SHIELD.recovery; ledger.breaches++; hit.building.status = 'shield breached'; }
  return fraction;
}
