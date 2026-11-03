import { colonyPlanet, sitePosition } from '../sim/localWorld';
import { habitatSource } from '../sim/habitats';
import { SUIT } from '../sim/astronaut';
import { STATIONS, distance, nearbyStation } from '../sim/surface';
import type { WorldState } from '../sim/world';
import { nearbyBuilding } from '../sim/colony';
import { BLUEPRINTS } from '../sim/colonyConfig';

export function surfacePanel(world: WorldState): string {
  const suit = world.astronaut, near = nearbyStation(world);
  const canBoard = distance(suit.position, world.ship.position) <= SUIT.boardingRange;
  const building = nearbyBuilding(world);
  return `<div class="surface-panel"><label>SURFACE OPERATIONS</label>
    <p class="objective">${suit.health <= 0 ? 'SUIT LOST · R to restart' : habitatSource(world) ? 'Habitat air · suit reserve held' : canBoard ? 'F: board ship' : 'Return to the ship before oxygen runs out'}</p>
    ${(world.siteBody === 'moon' ? STATIONS.filter(s => s.kind === 'depot').map(s => ({ ...s, angle: 54 / colonyPlanet(world).radius })) : STATIONS).map(station => `<div class="resource"><span>${station.label}</span><span>${distance(suit.position, sitePosition(world, station.angle)).toFixed(0)} m</span></div>`).join('')}
    <p>${near && suit.grounded ? `E: ${near.kind === 'depot' ? world.depotOpen ? 'close depot' : 'open depot / unload hold' : 'restore suit / repair / refuel'}` : building && suit.grounded ? `E: ${BLUEPRINTS[building.kind].label}${building.kind === 'refinery' ? ' · V: next recipe' : ''}` : 'Walk to a terminal, then press E'}</p>
    <small>${world.siteBody === 'moon' ? 'Airless moon · no free suit service. Bring supplies and build a powered service station. Return to the ship for cabin air.' : 'Depot right of pad · service left<br>Service: oxygen + suit health<br>Hull: 1 kg stored iron / 10%'}</small>
    ${world.depotOpen ? '<p class="objective">DEPOT OPEN · resource totals above</p>' : ''}</div>`;
}
