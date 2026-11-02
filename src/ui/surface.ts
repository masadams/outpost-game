import { SUIT } from '../sim/astronaut';
import { STATIONS, distance, nearbyStation, stationPosition } from '../sim/surface';
import type { WorldState } from '../sim/world';
import { nearbyBuilding } from '../sim/colony';
import { BLUEPRINTS } from '../sim/colonyConfig';

export function surfacePanel(world: WorldState): string {
  const suit = world.astronaut, near = nearbyStation(world);
  const canBoard = distance(suit.position, world.ship.position) <= SUIT.boardingRange;
  const building = nearbyBuilding(world);
  return `<div class="surface-panel"><label>SURFACE OPERATIONS</label>
    <p class="objective">${suit.health <= 0 ? 'SUIT LOST · R to restart' : canBoard ? 'F: board ship' : 'Return to the ship before oxygen runs out'}</p>
    ${STATIONS.map(station => `<div class="resource"><span>${station.label}</span><span>${distance(suit.position, stationPosition(station.angle)).toFixed(0)} m</span></div>`).join('')}
    <p>${near && suit.grounded ? `E: ${near.kind === 'depot' ? world.depotOpen ? 'close depot' : 'open depot / unload hold' : 'restore suit / repair / refuel'}` : building && suit.grounded ? `E: ${BLUEPRINTS[building.kind].label}${building.kind === 'refinery' ? ' · V: next recipe' : ''}` : 'Walk to a terminal, then press E'}</p>
    <small>Depot right of pad · service left<br>Service: oxygen + suit health<br>Hull: 1 kg stored iron / 10%</small>
    ${world.depotOpen ? '<p class="objective">DEPOT OPEN · resource totals above</p>' : ''}</div>`;
}
