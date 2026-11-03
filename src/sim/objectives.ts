import type { WorldState } from './world';
import { WORLD } from './config';
import { relative, nearestPlanet } from './celestial';
import { TECH_IDS } from './progressionConfig';
export type ObjectiveLink = 'cargo' | 'build' | 'equipment' | 'map' | 'research' | 'defence';
export const HABITAT_WORK_GOAL = 20;
export const OBJECTIVES = [
  { id: 'delivery', group: 'expedition', link: 'cargo', label: 'Make your first delivery', hint: 'Launch with W. Hold Space to mine the starter rocks; C collects fragments. Land on the marked pad and E unloads ore.' },
  { id: 'industry', group: 'expedition', link: 'build', label: 'Run supplied industry', hint: 'F leaves the ship. Walk with A/D, open Build [B], and place a solar array and refinery or rig. Work needs real feedstock and power.' },
  { id: 'equipment', group: 'expedition', link: 'equipment', label: 'Equip for exploration', hint: 'Build a powered lab, pay for research in Manage, and fabricate a module at home. No free stock or fuel is supplied.' },
  { id: 'moonWork', group: 'expedition', link: 'map', label: 'Work on Nacre', hint: 'Load finite rig/solar freight in Ship / Cargo, select Nacre in Map, fly and land manually. Unload supplies, leave the ship and run a local mining rig.' },
  { id: 'return', group: 'expedition', link: 'map', label: 'Return from the moon', hint: 'Board and fly home after working on Nacre. Plan around terrain and land on the home pad. E delivers any carried ore.' },
  { id: 'habitat', group: 'colony', link: 'build', label: 'Work under supplied air', hint: 'Supply and power a habitat, then spend 20 cumulative seconds inside on foot. Refine ice into oxygen. A shield supplies no air; a stopped or empty dome does not count.' },
  { id: 'research', group: 'colony', link: 'research', label: 'Complete the research tree', hint: 'Fund and power all four research projects in Manage. Equipment and shield fabrication still require their own materials and energy.' },
  { id: 'defence', group: 'colony', link: 'defence', label: 'Intercept a threat', hint: 'Save first. Supply a turret or use the ship laser to intercept an incoming meteor. Start a defence drill only when prepared; opening this panel does not start one.' },
] as const;
export type ObjectiveId = typeof OBJECTIVES[number]['id'];
export interface ObjectiveState { completed: ObjectiveId[]; returnArmed: boolean; habitatSeconds: number }
export const createObjectives = (): ObjectiveState => ({ completed: [], returnArmed: false, habitatSeconds: 0 });
/** Observe real simulation results. Objectives never award materials or take control. */
export function observeObjectives(w: WorldState, paidHabitatSeconds = 0): void {
  w = w.rootWorld ?? w;
  if (w.playerMode === 'astronaut' && w.astronaut.health > 0 && Number.isFinite(paidHabitatSeconds) && paidHabitatSeconds > 0) w.objectives.habitatSeconds = Math.min(HABITAT_WORK_GOAL, w.objectives.habitatSeconds + paidHabitatSeconds);
  const done = w.objectives.completed;
  const add = (id: ObjectiveId, condition: boolean) => { if (condition && !done.includes(id)) done.push(id); };
  add('delivery', w.unloaded > 0);
  add('industry', [w.colony, w.moon.colony].some(c => c.buildings.some(b => ['refinery', 'miningRig', 'fuelProcessor'].includes(b.kind) && b.status === 'running')));
  add('equipment', w.ship.equipment.length > 0);
  add('moonWork', w.playerMode === 'astronaut' && w.astronaut.health > 0 && nearestPlanet(w.astronaut.position, w.system).id === 'moon' && w.moon.surfaceDeposits.some(d=>d.remaining<d.initial-1e-6) && w.moon.colony.buildings.some(b => b.kind === 'miningRig' && b.status === 'running'));
  add('habitat', w.objectives.habitatSeconds >= HABITAT_WORK_GOAL - 1e-6);
  add('research', TECH_IDS.every(id => w.colony.research.completed.includes(id)));
  add('defence', w.defence.intercepted > 0);
  const body=nearestPlanet(w.ship.position,w.system),position=relative(w.ship.position,body);
  if(w.ship.state==='crashed'||w.astronaut.health<=0)w.objectives.returnArmed=false;
  if(w.astronaut.health>0&&done.includes('moonWork')&&w.playerMode==='ship'&&w.ship.state==='flying'&&body.id==='moon')w.objectives.returnArmed=true;
  const homePad=body.id==='home' && Math.abs(Math.hypot(position.x,position.y)-body.radius-WORLD.shipRadius)<.2 && Math.abs(Math.atan2(position.x,-position.y))*body.radius<=WORLD.padHalfWidth;
  add('return', w.objectives.returnArmed && done.includes('moonWork') && w.playerMode === 'ship' && w.ship.state === 'landed' && homePad);
}
export function validObjectives(value: ObjectiveState): boolean {
  return Array.isArray(value.completed) && Number.isFinite(value.habitatSeconds) && value.habitatSeconds >= 0 && value.habitatSeconds <= HABITAT_WORK_GOAL && (!value.completed.includes('habitat') || value.habitatSeconds >= HABITAT_WORK_GOAL - 1e-6) && typeof value.returnArmed==='boolean' && (!value.returnArmed || value.completed.includes('moonWork')) && value.completed.length <= OBJECTIVES.length && new Set(value.completed).size === value.completed.length && value.completed.every(id => OBJECTIVES.some(o => o.id === id)) && (!value.completed.includes('return') || value.completed.includes('moonWork'));
}

/** Read-only current progress. Recorded milestones remain complete after supplies are spent. */
export function objectiveProgress(source: WorldState, id: ObjectiveId): { value: number; target: number; unit: string } {
  const w = source.rootWorld ?? source, done = w.objectives.completed.includes(id);
  let value = 0, target = 1, unit = 'milestone';
  switch (id) {
    case 'delivery': value = w.unloaded > 0 ? 1 : 0; break;
    case 'industry': value = [w.colony, w.moon.colony].some(c => c.buildings.some(b => ['refinery', 'miningRig', 'fuelProcessor'].includes(b.kind) && b.status === 'running')) ? 1 : 0; break;
    case 'equipment': value = w.ship.equipment.length > 0 ? 1 : 0; break;
    case 'moonWork': target = 2; unit = 'steps'; value = (w.playerMode === 'astronaut' && w.astronaut.health > 0 && nearestPlanet(w.astronaut.position,w.system).id === 'moon' ? 1 : 0) + (w.moon.surfaceDeposits.some(d=>d.remaining<d.initial-1e-6) && w.moon.colony.buildings.some(b=>b.kind==='miningRig'&&b.status==='running') ? 1 : 0); break;
    case 'return': target = 2; unit = 'steps'; value = w.objectives.returnArmed ? 1 : 0; break;
    case 'habitat': target = HABITAT_WORK_GOAL; unit = 's of supplied air'; value = w.objectives.habitatSeconds; break;
    case 'research': target = TECH_IDS.length; unit = 'technologies'; value = w.colony.research.completed.length; break;
    case 'defence': unit = 'interception'; value = w.defence.intercepted; break;
  }
  return { value: done ? target : Math.min(target, value), target, unit };
}
