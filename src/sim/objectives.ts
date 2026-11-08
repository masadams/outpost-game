import type { WorldState } from './world';
import { WORLD } from './config';
import { relative, nearestPlanet } from './celestial';
import { TECH_IDS } from './progressionConfig';
import { bodyKnown } from './explorationConfig';
export type ObjectiveLink = 'cargo' | 'build' | 'equipment' | 'map' | 'research' | 'defence';
export const HABITAT_WORK_GOAL = 20;
export const OBJECTIVES = [
  { id: 'delivery', group: 'expedition', link: 'cargo', label: 'Make your first delivery', hint: 'Press W to launch. Hold Space to mine a rock, then hold C to pull the fragments in. Land on the green pad and press E to unload.' },
  { id: 'industry', group: 'expedition', link: 'build', label: 'Turn ore into metal', hint: 'Ore is piling up in the depot with nothing to turn it into metal. Press F to step out; B opens the blueprints you have.' },
  { id: 'buoy', group: 'expedition', link: 'map', label: 'Reach the survey buoy', hint: 'A survey buoy is marked on the Map: Frost. Whoever left it may have left something to learn.' },
  { id: 'sky', group: 'expedition', link: 'build', label: 'The sky', hint: 'The buoy data describes an instrument. The longer it watches, the more it can tell you about what is out there.' },
  { id: 'storm', group: 'expedition', link: 'defence', label: 'Survive the storm', hint: 'Something is coming. Rocks can be broken up before they land.' },
  { id: 'analysis', group: 'expedition', link: 'build', label: 'Learn from the storm', hint: 'Pieces of the storm lie on the ground. They are not ordinary rock.' },
  { id: 'storm2', group: 'expedition', link: 'defence', label: 'Survive the second storm', hint: 'A bigger storm is gathering.' },
  { id: 'equipment', group: 'expedition', link: 'equipment', label: 'Build a better ship', hint: 'The lab is running. A better ship needs parts, and parts need research and materials.' },
  { id: 'moonWork', group: 'expedition', link: 'map', label: 'Nacre', hint: 'The Observatory has found the moon, Nacre. Its surface is marked with ore seams.' },
  { id: 'return', group: 'expedition', link: 'map', label: 'Return from the moon', hint: 'The moon has given up its first ore. It is worth nothing until it reaches home.' },
  { id: 'habitat', group: 'colony', link: 'build', label: 'Live under a dome', hint: 'A habitat holds air. Twenty seconds inside on foot, with the air running, makes it a place to live.' },
  { id: 'research', group: 'colony', link: 'research', label: 'Finish all research', hint: 'Every line of research, finished.' },
  { id: 'defence', group: 'colony', link: 'defence', label: 'Intercept a threat', hint: 'Stop a falling rock before it lands, with a turret or the ship laser.' },
] as const;
/**
 * Whether a milestone has come up yet. Milestones are revealed by what happens, so the card never lists what is
 * ahead: it shows only the open ones whose cue has fired.
 */
export function objectiveCue(source: WorldState, id: ObjectiveId): boolean {
  const w = source.rootWorld ?? source;
  const done = w.objectives.completed;
  const built = (kind: string) => [w.colony, ...Object.values(w.outposts).map(o => o.colony)].some(c => c.buildings.some(b => b.kind === kind));
  switch (id) {
    case 'delivery': return true;
    case 'industry': return done.includes('delivery');
    case 'buoy': return done.includes('industry');
    case 'sky': return done.includes('buoy') || !w.system.sun;
    case 'storm': return built('observatory') || w.storm.phase !== 'quiet' || done.includes('storm');
    case 'analysis': return w.storm.samples.length > 0 || w.storm.held > 0 || w.storm.analysed;
    case 'storm2': return done.includes('storm') && w.storm.wave >= 2;
    case 'equipment': return built('researchLab') || w.colony.research.completed.length > 0;
    case 'moonWork': return bodyKnown(w.exploration, 'moon') || done.includes('moonWork');
    case 'return': return done.includes('moonWork');
    case 'habitat': return built('habitatSmall') || built('habitatLarge');
    case 'research': return built('researchLab');
    case 'defence': return built('laser') || built('flak') || built('missile') || w.defence.intercepted > 0;
  }
}
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
  add('storm2', (w.storm.wave > 2 || (w.storm.wave === 2 && w.storm.phase === 'over')) && w.ship.state !== 'crashed' && w.astronaut.health > 0);
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
    case 'storm2': value = w.storm.wave > 2 || (w.storm.wave === 2 && w.storm.phase === 'over') ? 1 : 0; break;
    case 'analysis': value = w.storm.analysed ? 1 : 0; break;
    case 'equipment': value = w.ship.equipment.length > 0 ? 1 : 0; break;
    case 'moonWork': target = 2; unit = 'steps'; value = (w.playerMode === 'astronaut' && w.astronaut.health > 0 && nearestPlanet(w.astronaut.position,w.system).id === 'moon' ? 1 : 0) + (w.outposts.moon.surfaceDeposits.some(d=>d.remaining<d.initial-1e-6) && w.outposts.moon.colony.buildings.some(b=>b.kind==='miningRig'&&b.status==='running') ? 1 : 0); break;
    case 'return': target = 2; unit = 'steps'; value = w.objectives.returnArmed ? 1 : 0; break;
    case 'habitat': target = HABITAT_WORK_GOAL; unit = 's with the air on'; value = w.objectives.habitatSeconds; break;
    case 'research': target = TECH_IDS.length; unit = 'technologies'; value = w.colony.research.completed.length; break;
    case 'defence': unit = 'interception'; value = w.defence.intercepted; break;
  }
  return { value: done ? target : Math.min(target, value), target, unit };
}
