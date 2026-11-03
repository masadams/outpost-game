import type { WorldState } from './world';
import { WORLD } from './config';
import { relative, nearestPlanet } from './celestial';
export const OBJECTIVES = [
  { id: 'delivery', label: 'Make your first delivery', hint: 'Launch with W. Hold Space to mine the starter rocks; C collects fragments. Land on the marked pad and E unloads ore.' },
  { id: 'industry', label: 'Run supplied industry', hint: 'F leaves the ship. Walk with A/D, open Colony [B], and place a solar array and refinery or rig. Work needs real feedstock and power.' },
  { id: 'equipment', label: 'Equip for exploration', hint: 'Build a powered lab, pay for research in Command, and fabricate a module at home. No free stock or fuel is supplied.' },
  { id: 'moonWork', label: 'Work on Nacre', hint: 'Load finite rig/solar freight in Cargo, select Nacre in Nav, fly and land manually. Unload supplies, leave the ship and run a local mining rig.' },
  { id: 'return', label: 'Return from the moon', hint: 'Board and fly home after working on Nacre. Plan around terrain and land on the home pad. E delivers any carried ore.' },
] as const;
export type ObjectiveId = typeof OBJECTIVES[number]['id'];
export interface ObjectiveState { completed: ObjectiveId[]; returnArmed: boolean }
export const createObjectives = (): ObjectiveState => ({ completed: [], returnArmed: false });
/** Observe real simulation results. Objectives never award materials or take control. */
export function observeObjectives(w: WorldState): void {
  const done = w.objectives.completed;
  const add = (id: ObjectiveId, condition: boolean) => { if (condition && !done.includes(id)) done.push(id); };
  add('delivery', w.unloaded > 0);
  add('industry', [w.colony, w.moon.colony].some(c => c.buildings.some(b => ['refinery', 'miningRig', 'fuelProcessor'].includes(b.kind) && b.status === 'running')));
  add('equipment', w.ship.equipment.length > 0);
  add('moonWork', w.playerMode === 'astronaut' && w.astronaut.health > 0 && nearestPlanet(w.astronaut.position, w.system).id === 'moon' && w.moon.surfaceDeposits.some(d=>d.remaining<d.initial-1e-6) && w.moon.colony.buildings.some(b => b.kind === 'miningRig' && b.status === 'running'));
  const body=nearestPlanet(w.ship.position,w.system),position=relative(w.ship.position,body);
  if(w.ship.state==='crashed'||w.astronaut.health<=0)w.objectives.returnArmed=false;
  if(w.astronaut.health>0&&done.includes('moonWork')&&w.playerMode==='ship'&&w.ship.state==='flying'&&body.id==='moon')w.objectives.returnArmed=true;
  const homePad=body.id==='home' && Math.abs(Math.hypot(position.x,position.y)-body.radius-WORLD.shipRadius)<.2 && Math.abs(Math.atan2(position.x,-position.y))*body.radius<=WORLD.padHalfWidth;
  add('return', w.objectives.returnArmed && done.includes('moonWork') && w.playerMode === 'ship' && w.ship.state === 'landed' && homePad);
}
export function validObjectives(value: ObjectiveState): boolean {
  return Array.isArray(value.completed) && typeof value.returnArmed==='boolean' && (!value.returnArmed || value.completed.includes('moonWork')) && value.completed.length <= OBJECTIVES.length && new Set(value.completed).size === value.completed.length && value.completed.every(id => OBJECTIVES.some(o => o.id === id)) && (!value.completed.includes('return') || value.completed.includes('moonWork'));
}
