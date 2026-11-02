import { SUIT } from './astronaut';
import { WORLD } from './config';
import { heading, localAngle, type Vec } from './math';
import { inventoryMass } from './resources';
import type { WorldState } from './world';
import { unloadCargo } from './cargo';
import { STATIONS, stationPosition } from './stations';
import { notify } from './messages';
import { applyColonyAction, nearbyBuilding } from './colony';
import { refuelShip, serviceAtBuilding } from './colonyService';
export { STATIONS, stationPosition } from './stations';
export { notify } from './messages';

export const distance = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);
export function boardOrExit(world: WorldState): void {
  if (world.astronaut.health <= 0) { notify(world, 'SUIT LOST · R TO RESTART'); return; }
  if (world.ship.state !== 'landed') { notify(world, 'LAND SAFELY BEFORE USING THE AIRLOCK'); return; }
  if (world.playerMode === 'ship') {
    const angle = localAngle(world.ship.position) + SUIT.exitOffset / WORLD.radius;
    const n = heading(angle);
    world.astronaut.position = { x: n.x * (WORLD.radius + SUIT.radius), y: n.y * (WORLD.radius + SUIT.radius) };
    world.astronaut.velocity = { x: 0, y: 0 }; world.astronaut.grounded = true;
    world.astronaut.jumpHeld = false; world.playerMode = 'astronaut';
    notify(world, 'AIRLOCK OPEN · A/D WALK · SPACE JUMP');
  } else if (distance(world.astronaut.position, world.ship.position) <= SUIT.boardingRange) {
    world.playerMode = 'ship'; world.depotOpen = false; world.colony.buildOpen = false; world.astronaut.oxygen = SUIT.oxygen;
    notify(world, 'CABIN SECURED · FLIGHT CONTROLS ACTIVE');
  } else notify(world, 'MOVE WITHIN 20 m OF THE SHIP TO BOARD');
}
export function nearbyStation(world: WorldState) {
  return STATIONS.find(station => distance(world.astronaut.position, stationPosition(station.angle)) <= 12);
}
export function interactSurface(world: WorldState): void {
  if (world.playerMode !== 'astronaut' || world.astronaut.health <= 0) return;
  const station = nearbyStation(world);
  const building = nearbyBuilding(world);
  if (!station && building && world.astronaut.grounded) {
    if (building.kind === 'service') serviceAtBuilding(world, building);
    else applyColonyAction(world, { type: 'toggleMachine' });
    return;
  }
  if (!station || !world.astronaut.grounded) { notify(world, 'STAND BESIDE A SURFACE TERMINAL TO INTERACT'); return; }
  if (station.kind === 'depot') {
    world.depotOpen = !world.depotOpen;
    if (!world.depotOpen) { notify(world, 'DEPOT CLOSED'); return; }
    const mass = world.ship.state === 'landed' && distance(world.ship.position, stationPosition(station.angle)) < 80 ? unloadCargo(world) : 0;
    notify(world, mass > 0 ? `DEPOT RECEIVED ${mass.toFixed(1)} kg` : `DEPOT OPEN · ${inventoryMass(world.depot).toFixed(1)} kg STORED`);
  } else {
    world.astronaut.oxygen = SUIT.oxygen; world.astronaut.health = 100;
    const canRepair = world.ship.state === 'landed' && distance(world.ship.position, stationPosition(station.angle)) < 80;
    const repair = canRepair ? Math.min(100 - world.ship.hull, world.depot.iron * 10) : 0;
    world.ship.hull += repair; world.depot.iron = Math.max(0, world.depot.iron - repair / 10);
    const fuel = refuelShip(world, stationPosition(station.angle));
    notify(world, fuel > 0 ? `SUIT RESTORED · FUEL +${fuel.toFixed(1)} kg` : repair > 0 ? `SUIT RESTORED · HULL +${repair.toFixed(0)}%` : 'SUIT RESTORED · HULL REPAIR: 1 kg IRON / 10%');
  }
}
