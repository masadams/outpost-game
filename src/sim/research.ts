import {workFactor} from './facilityStats';
import { colonyWorld } from './localWorld';
import { TECHNOLOGIES, TECH_IDS, PROGRESSION, type TechId, type ProgressionAction } from './progressionConfig';
import { PRODUCTS } from './colonyConfig';
import { availableProduct, industrialPowerBlock } from './colonyPolicy';
import { productCapacity, type Building } from './colony';
import { powerFraction } from './power';
import { notify } from './messages';
import type { WorldState } from './world';
export function researchError(w: WorldState, tech: TechId): string | null {
  if (!TECH_IDS.includes(tech)) return 'Unknown technology';
  const r = w.colony.research, spec = TECHNOLOGIES[tech];
  if (r.completed.includes(tech)) return 'Already researched';
  if (r.queue.some(p => p.tech === tech)) return 'Project already queued';
  if (spec.requires.some(id => !r.completed.includes(id))) return 'Complete prerequisite research first';
  if (PRODUCTS.some(p => availableProduct(w.colony, p) + 1e-9 < (spec.cost[p] ?? 0))) return 'Needs unreserved research materials';
  return null;
}
export function applyResearch(w: WorldState, a: Extract<ProgressionAction, { type: 'researchStart' | 'researchControl' }>): void {
  const r = w.colony.research;
  if (w.playerMode === 'ship' ? w.ship.state === 'crashed' : w.astronaut.health <= 0) { notify(w, 'RECOVER BEFORE ISSUING RESEARCH ORDERS'); return; }
  if (a.type === 'researchStart') {
    const error = researchError(w, a.tech); if (error) { notify(w, error); return; }
    for (const p of PRODUCTS) w.colony.products[p] = Math.max(0, w.colony.products[p] - (TECHNOLOGIES[a.tech].cost[p] ?? 0));
    r.queue.push({ funding: w.siteBody ?? 'home', tech: a.tech, progress: 0, paused: false }); notify(w, 'RESEARCH MATERIALS COMMITTED · POWER AN ENABLED LAB'); return;
  }
  const project = r.queue.find(p => p.tech === a.tech); if (!project) return;
  if (a.operation === 'pause') { project.paused = !project.paused; return; }
  if (a.operation !== 'cancel') return;
  const funding = colonyWorld(w, project.funding).colony;
  const spec = TECHNOLOGIES[a.tech], fraction = Math.max(0, 1 - project.progress / spec.seconds);
  if (PRODUCTS.some(p => funding.products[p] + (spec.cost[p] ?? 0) * fraction > productCapacity(funding) + 1e-9)) { notify(w, 'MAKE PRODUCT ROOM AT THE FUNDING COLONY BEFORE CANCELLING RESEARCH'); return; }
  for (const p of PRODUCTS) funding.products[p] += (spec.cost[p] ?? 0) * fraction;
  r.queue = r.queue.filter(p => p !== project); notify(w, 'RESEARCH CANCELLED · UNWORKED SAMPLES RETURNED');
}
/** One lab contributes each tick. Industry ordering/reserves/caps apply to real paid work. */
export function stepResearch(w: WorldState, b: Building, dt: number, staffed: boolean): boolean {
  const r = w.colony.research, p = r.queue.find(p => !p.paused); if (!p) return false;
  if (staffed) { b.status = 'research staffed'; return false; }
  const spec = TECHNOLOGIES[p.tech], work = Math.min(dt * powerFraction(b) * workFactor(b), spec.seconds - p.progress);
  b.requestedPower = PROGRESSION.labPower * powerFraction(b) * workFactor(b); w.colony.demand += b.requestedPower;
  if (work <= 0) { b.status = 'power limited'; return false; }
  const cost = work * PROGRESSION.labPower, block = industrialPowerBlock(w.colony, cost);
  if (block) { b.status = block; return false; }
  w.colony.energy = Math.max(0, w.colony.energy - cost); r.energyUsed += cost; b.gridPower = cost / dt; b.status = 'running'; p.progress += work;
  if (p.progress + 1e-9 >= spec.seconds) { r.completed.push(p.tech); r.queue = r.queue.filter(q => q !== p); notify(w, `${spec.label.toUpperCase()} COMPLETE · UNLOCKS AVAILABLE`); }
  return true;
}
