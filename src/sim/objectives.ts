import type { WorldState } from './world';
import { WORLD } from './config';
import { relative, nearestPlanet } from './celestial';
import { TECH_IDS } from './progressionConfig';
export type ObjectiveLink = 'cargo' | 'build' | 'equipment' | 'map' | 'research' | 'defence';
export const HABITAT_WORK_GOAL = 20;
export const OBJECTIVES = [
  { id: 'delivery', group: 'expedition', link: 'cargo', label: 'Make your first delivery', hint: 'Press W to launch. Hold Space to mine a rock, then hold C to pull the fragments in. Land on the green pad and press E to unload.' },
  { id: 'industry', group: 'expedition', link: 'build', label: 'Get industry running', hint: 'Press F to step out and walk with A/D. Press B to build a solar array and a refinery. The refinery runs once it has ore and power.' },
  { id: 'buoy', group: 'expedition', link: 'map', label: 'Reach the survey buoy', hint: 'Open the Map, pick the Frost survey buoy, fly there and survey it. Its data lets you build an Observatory.' },
  { id: 'sky', group: 'expedition', link: 'build', label: 'Watch the sky', hint: 'Build an Observatory and a solar array to power it. Leave it scanning; the longer it watches, the better it can tell you what is out there.' },
  { id: 'storm', group: 'expedition', link: 'defence', label: 'Survive the storm', hint: 'Something is coming. Use the warning to get ready, then ride it out. Turrets and your ship laser can break rocks up before they land.' },
  { id: 'analysis', group: 'expedition', link: 'build', label: 'Learn from the storm', hint: 'Pieces of the storm lie on the ground. Walk over one, then open Base and analyse it.' },
  { id: 'storm2', group: 'expedition', link: 'defence', label: 'Survive the second storm', hint: 'A bigger storm is coming. The Observatory will warn you. Missile turrets reach farther than lasers and hit harder.' },
  { id: 'equipment', group: 'expedition', link: 'equipment', label: 'Equip for exploration', hint: 'Build a powered lab, pay for research in Manage, and fabricate a module at home. No free stock or fuel is supplied.' },
  { id: 'moonWork', group: 'expedition', link: 'map', label: 'Work on Nacre', hint: 'Load the rig kit from the Ship window, pick Nacre on the Map and land on its pad. Press E to unload, step out, then build a solar array and a mining rig on a marked seam.' },
  { id: 'return', group: 'expedition', link: 'map', label: 'Return from the moon', hint: 'Board and fly home from Nacre, landing on the home pad. Press E to deliver the ore you carry.' },
  { id: 'habitat', group: 'colony', link: 'build', label: 'Work under supplied air', hint: 'Supply and power a habitat, then spend 20 cumulative seconds inside on foot. Refine ice into oxygen. A shield supplies no air; a stopped or empty dome does not count.' },
  { id: 'research', group: 'colony', link: 'research', label: 'Complete the research tree', hint: 'Fund and power all ten research projects in Manage. Equipment and shield fabrication still require their own materials and energy.' },
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
  add('industry', [w.colony, w.outposts.moon.colony].some(c => c.buildings.some(b => ['refinery', 'miningRig', 'fuelProcessor'].includes(b.kind) && b.status === 'running')));
  add('buoy', w.exploration.surveyed.includes('frost'));
  add('sky', w.colony.buildings.some(b => b.kind === 'observatory' && b.status === 'running'));
  add('storm', w.storm.phase === 'over' && w.ship.state !== 'crashed' && w.astronaut.health > 0);
  add('analysis', w.storm.analysed);
  add('storm2', w.storm.wave === 2 && w.storm.phase === 'over' && w.ship.state !== 'crashed' && w.astronaut.health > 0);
  add('equipment', w.ship.equipment.length > 0);
  add('moonWork', w.playerMode === 'astronaut' && w.astronaut.health > 0 && nearestPlanet(w.astronaut.position, w.system).id === 'moon' && w.outposts.moon.surfaceDeposits.some(d=>d.remaining<d.initial-1e-6) && w.outposts.moon.colony.buildings.some(b => b.kind === 'miningRig' && b.status === 'running'));
  add('habitat', w.objectives.habitatSeconds >= HABITAT_WORK_GOAL - 1e-6);
  add('research', TECH_IDS.every(id => w.colony.research.completed.includes(id)));
  add('defence', w.defence.intercepted > 0);
  const body=nearestPlanet(w.ship.position,w.system),position=relative(w.ship.position,body);
  if(w.ship.state==='crashed'||w.astronaut.health<=0)w.objectives.returnArmed=false;
  if(w.astronaut.health>0&&done.includes('moonWork')&&w.playerMode==='ship'&&w.ship.state==='flying'&&body.id==='moon')w.objectives.returnArmed=true;
  const homePad=body.id==='home' && Math.abs(Math.hypot(position.x,position.y)-body.radius-WORLD.shipRadius)<.2 && Math.abs(Math.atan2(Math.sin(Math.atan2(position.x,-position.y)-body.spin),Math.cos(Math.atan2(position.x,-position.y)-body.spin)))*body.radius<=WORLD.padHalfWidth;
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
    case 'industry': value = [w.colony, w.outposts.moon.colony].some(c => c.buildings.some(b => ['refinery', 'miningRig', 'fuelProcessor'].includes(b.kind) && b.status === 'running')) ? 1 : 0; break;
    case 'buoy': value = w.exploration.surveyed.includes('frost') ? 1 : 0; break;
    case 'sky': value = w.colony.buildings.some(b => b.kind === 'observatory' && b.status === 'running') ? 1 : 0; break;
    case 'storm': value = w.storm.phase === 'over' ? 1 : 0; break;
    case 'storm2': value = w.storm.wave === 2 && w.storm.phase === 'over' ? 1 : 0; break;
    case 'analysis': value = w.storm.analysed ? 1 : 0; break;
    case 'equipment': value = w.ship.equipment.length > 0 ? 1 : 0; break;
    case 'moonWork': target = 2; unit = 'steps'; value = (w.playerMode === 'astronaut' && w.astronaut.health > 0 && nearestPlanet(w.astronaut.position,w.system).id === 'moon' ? 1 : 0) + (w.outposts.moon.surfaceDeposits.some(d=>d.remaining<d.initial-1e-6) && w.outposts.moon.colony.buildings.some(b=>b.kind==='miningRig'&&b.status==='running') ? 1 : 0); break;
    case 'return': target = 2; unit = 'steps'; value = w.objectives.returnArmed ? 1 : 0; break;
    case 'habitat': target = HABITAT_WORK_GOAL; unit = 's of supplied air'; value = w.objectives.habitatSeconds; break;
    case 'research': target = TECH_IDS.length; unit = 'technologies'; value = w.colony.research.completed.length; break;
    case 'defence': unit = 'interception'; value = w.defence.intercepted; break;
  }
  return { value: done ? target : Math.min(target, value), target, unit };
}
