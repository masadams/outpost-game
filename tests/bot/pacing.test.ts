import { it } from 'vitest';
import { createWorld, stepWorld, type WorldState } from '../../src/sim/world';
import { completedBuilding } from '../../src/sim/construction';
import { BLUEPRINTS, PRODUCTS, type BuildType } from '../../src/sim/colonyConfig';
import { TECH_IDS, TECHNOLOGIES, type TechId } from '../../src/sim/progressionConfig';
import { applyResearch, researchError } from '../../src/sim/research';
import { oreCapacity, productCapacity, energyCapacity } from '../../src/sim/colony';
import { inventoryMass } from '../../src/sim/resources';
import { placementError } from '../../src/sim/colony';
import { turretState } from '../../src/sim/weapons';
import { observeObjectives } from '../../src/sim/objectives';
import { DAY_LENGTH } from '../../src/sim/config';
import { hqUpgradeBlock, upgradeHq, hqLevel } from '../../src/sim/headquarters';

const IDLE = { thrust: false, turn: 0 };
const log: string[] = [];
const marks: Record<string, number> = {};
const mark = (w: WorldState, key: string) => { if (marks[key] === undefined) { marks[key] = w.system.time; log.push(`${(w.system.time / DAY_LENGTH).toFixed(2)} d · ${key}`); } };

function afford(w: WorldState, kind: BuildType): boolean {
  const c = BLUEPRINTS[kind].cost;
  return PRODUCTS.every(p => w.colony.products[p] >= (c[p] ?? 0));
}
function pay(w: WorldState, kind: BuildType) {
  const c = BLUEPRINTS[kind].cost;
  for (const p of PRODUCTS) w.colony.products[p] -= c[p] ?? 0;
}
let nextAngle = -0.05;
function freeAngle(w: WorldState, kind: BuildType): number | null {
  for (let i = 0; i < 400; i++) {
    nextAngle += 0.004;
    if (Math.abs(nextAngle) > 1.2) nextAngle = -1.2;
    if (!placementError(w, kind, nextAngle, { remote: true } as never)) return nextAngle;
  }
  return null;
}
let unplaceable = false;
function build(w: WorldState, kind: BuildType, angle?: number): boolean {
  if (!afford(w, kind)) return false;
  const a = angle ?? freeAngle(w, kind);
  if (a === null) { unplaceable = true; return false; }
  pay(w, kind);
  const b = completedBuilding(w.colony.nextId++, kind, a, w);
  if (kind === 'laser') turretState(b).automatic = true;
  w.colony.buildings.push(b);
  mark(w, `built first ${kind}`);
  return true;
}

/**
 * A bot that plays a fixed build order on a seeded day-cycle game and prints when each stage lands. It cannot fly, so
 * hauling is modelled as one trip every 150 s and the buoy/derelict finds are assumed at fixed times. Run with
 * `npm run bot`; it is not part of the normal test run.
 */
it('pacing bot', () => {
  const w = createWorld(31337);
  w.system.sun = true;
  w.system.binary = true;
  const plan: BuildType[] = ['solar', 'refinery', 'battery', 'storage', 'miningRig', 'solar', 'refinery', 'researchLab', 'battery', 'observatory', 'laser', 'solar', 'miningRig', 'battery', 'storage', 'refinery', 'laser', 'solar', 'miningRig', 'battery', 'fuelProcessor', 'solar', 'battery', 'storage', 'laser', 'miningRig', 'solar', 'battery', 'droneBay', 'workerBay', 'tugBay', 'solar', 'battery', 'refinery', 'storage', 'solar', 'battery'];
  let step = 0;
  const dt = 0.5;
  let haulAt = 60;
  let nightLow = Infinity;
  const days = 15;
  const samples: string[] = [];
  const made = { alloy: 0, wire: 0, components: 0 } as Record<string, number>;
  const daily: string[] = [];
  let repaired = 0;
  let lastDay = 0;
  let lastStock = { ...w.colony.products } as Record<string, number>;
  for (let i = 0; i < (days * DAY_LENGTH) / dt; i++) {
    lastStock = { ...w.colony.products };
    stepWorld(w, IDLE, dt);
    observeObjectives(w);
    const t = w.system.time;
    // Ship hauling: one trip every 150 s, two or three rocks, while rocks last.
    if (t >= haulAt) {
      haulAt = t + 150;
      let hold = 120;
      const room = () => oreCapacity(w.colony) - inventoryMass(w.depot);
      while (hold > 0 && room() > 0) {
        const rock = w.asteroids.find(a => a.stage === 0 && !a.belt);
        if (!rock) break;
        const kg = Math.min(rock.mass, hold, room());
        w.depot[rock.resource] += kg;
        hold -= kg;
        w.asteroids = w.asteroids.filter(a => a !== rock);
      }
      if (hold < 120) { w.unloaded += 120 - hold; mark(w, 'first delivery'); }
      else mark(w, 'rocks used up (or depot full)');
    }
    // Story stand-ins for flights the bot cannot fly.
    if (t > 1500 && !w.exploration.surveyed.includes('frost')) { w.exploration.surveyed.push('frost'); mark(w, 'buoy surveyed (assumed)'); }
    if (w.storm.phase === 'over' && !w.storm.analysed && w.storm.wave >= 1) { w.storm.analysed = true; mark(w, 'storm piece analysed (assumed)'); }
    if (t > 3500 && !w.exploration.surveyed.includes('copper')) { w.exploration.surveyed.push('copper'); mark(w, 'derelict found (assumed)'); }
    // Product made: count every rise in stock, before anything is spent.
    for (const p of PRODUCTS.slice(0, 3)) {
      const now = w.colony.products[p];
      if (now > lastStock[p]) made[p] += now - lastStock[p];
    }
    const day = Math.floor(t / DAY_LENGTH);
    if (day > lastDay) {
      daily.push(`day ${day} · made alloy ${made.alloy.toFixed(0)}, wire ${made.wire.toFixed(0)}, components ${made.components.toFixed(0)} · HQ level ${hqLevel(w.colony)} · buildings ${w.colony.buildings.length} · ore left on Selene ${w.surfaceDeposits.reduce((n, d) => n + d.remaining, 0).toFixed(0)} · rocks ${w.asteroids.filter(a => !a.belt).length}`);
      made.alloy = made.wire = made.components = 0;
      lastDay = day;
    }
    // Headquarters: upgrade once the build plan is done and it can be paid for.
    if (step >= 28 && hqUpgradeBlock(w) === null) { upgradeHq(w); mark(w, `HQ level ${hqLevel(w.colony)}`); }
    // The pilot walks round once a minute and patches up what storms broke, as a player would.
    if (i % 120 === 60) {
      for (const b of w.colony.buildings) {
        const need = 100 - (b.health ?? 100);
        const can = Math.min(need, w.colony.products.alloy * 10);
        if (can <= 0) continue;
        b.health = (b.health ?? 100) + can;
        w.colony.products.alloy -= can / 10;
        repaired += can / 10;
      }
    }
    // Builder
    if (step < plan.length) {
      let kind = plan[step];
      let angle: number | undefined;
      if (kind === 'miningRig') {
        const used = new Set(w.colony.buildings.filter(b => b.kind === 'miningRig').map(b => b.depositId));
        const seam = w.surfaceDeposits.filter(d => !used.has(d.id) && d.remaining > 10).sort((a, b) => Math.abs(a.angle) - Math.abs(b.angle))[0];
        if (!seam) { step++; continue; }
        angle = seam.angle;
      }
      if (kind === 'observatory' && !w.exploration.surveyed.includes('frost')) kind = 'solar';
      else if (build(w, kind, angle)) step++;
      else if (unplaceable) { unplaceable = false; mark(w, `could not place ${kind}`); step++; }
    }
    // Refinery recipes: each minute, point refineries at the scarcest product we have ore for.
    if (i % 120 === 0) {
      const refs = w.colony.buildings.filter(b => b.kind === 'refinery');
      const ore: Record<number, number> = { 0: w.depot.iron, 1: w.depot.copper, 2: Math.min(w.depot.silicon / 0.9, w.depot.rareMetals / 0.1), 3: w.depot.ice };
      const stock = [w.colony.products.alloy / 2, w.colony.products.wire, w.colony.products.components, w.colony.products.water * 3];
      const order = [0, 1, 2, 3].filter(r => ore[r] > 1).sort((a, b) => stock[a] - stock[b]);
      refs.forEach((b, k) => { if (order.length) b.recipe = order[k % order.length]; });
      if (refs.some(b => b.status === 'running')) mark(w, 'industry running');
      const night = w.colony.generation < 0.5;
      if (night && w.colony.buildings.length > 4) nightLow = Math.min(nightLow, w.colony.energy);
      if (i % 2400 === 0) samples.push(`${(t / DAY_LENGTH).toFixed(1)} d · products ${PRODUCTS.slice(0, 3).map(p => `${p} ${w.colony.products[p].toFixed(0)}`).join(', ')} / cap ${productCapacity(w.colony)} · ore ${inventoryMass(w.depot).toFixed(0)}/${oreCapacity(w.colony)} · gen ${w.colony.generation.toFixed(1)} kW · demand ${w.colony.demand.toFixed(1)} kW · stored ${w.colony.energy.toFixed(0)}/${energyCapacity(w.colony)} kJ · techs ${w.colony.research.completed.length} · buildings ${w.colony.buildings.length} (wrecked ${w.colony.buildings.filter(b => (b.health ?? 100) <= 0).length}) · seams left ${w.surfaceDeposits.reduce((n, d) => n + d.remaining, 0).toFixed(0)}`);
    }
    // Research: keep one project going, cheapest first.
    if (w.colony.buildings.some(b => b.kind === 'researchLab') && w.colony.research.queue.length === 0) {
      const open = TECH_IDS.filter(id => researchError(w, id) === null).sort((a, b) => sumCost(a) - sumCost(b));
      if (open.length) { applyResearch(w, { type: 'researchStart', tech: open[0] }); mark(w, 'first research started'); }
    }
    const n = w.colony.research.completed.length;
    if (n >= 1) mark(w, '1 tech');
    if (n >= 5) mark(w, '5 techs');
    if (n >= 10) mark(w, '10 techs');
    if (n >= 15) mark(w, '15 techs');
    if (n >= 20) mark(w, '20 techs');
    if (w.storm.wave >= 1 && w.storm.phase === 'over') mark(w, 'storm 1 over');
    if (w.storm.wave >= 2 && w.storm.phase === 'over') mark(w, 'storm 2 over');
    if (w.storm.wave >= 3 && w.storm.phase === 'over') mark(w, 'storm 3 over');
    if (step >= plan.length) mark(w, 'build plan finished');
    for (const e of w.exploration.events?.journal ?? []) if (!log.includes('   event: ' + e)) log.push('   event: ' + e);
  }
  const blocked = TECH_IDS.filter(id => !w.colony.research.completed.includes(id)).map(id => `${id}: ${researchError(w, id)}`);
  const out = [
    'MILESTONES', ...log, '', 'DAILY OUTPUT', ...daily, '', 'SNAPSHOTS', ...samples, '',
    `Lowest stored power at night: ${nightLow.toFixed(0)} kJ`,
    `Alloy spent on repairs: ${repaired.toFixed(0)}`,
    `Plan step reached: ${step}/${plan.length} (next: ${plan[step] ?? '-'})`,
    `Objectives: ${w.objectives.completed.join(', ')}`,
    `Techs done ${w.colony.research.completed.length}/${TECH_IDS.length}`, 'Not done:', ...blocked,
  ];
  console.log('PACING\n' + out.join('\n'));
});
const sumCost = (id: TechId) => Object.values(TECHNOLOGIES[id].cost).reduce((n, v) => n + (v ?? 0), 0);
