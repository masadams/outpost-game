import { buildingHealth } from '../sim/buildingHealth';
import { isTurret, WEAPONS } from '../sim/defenceConfig';
import { defencePanel } from './defence';
import type { ThreatPrediction } from '../sim/meteor';
import { BLUEPRINTS, BUILD_TYPES, PRODUCTS, type BuildType } from '../sim/colonyConfig';
import { energyCapacity, oreCapacity, placementError, nearbyBuilding, recipeFor, type ColonyAction } from '../sim/colony';
import { inventoryMass } from '../sim/resources';
import type { WorldState } from '../sim/world';

export function colonyPanel(world: WorldState, paused: boolean, threats: ThreatPrediction[] = []): string {
  const colony = world.colony, disabled = paused || world.playerMode !== 'astronaut' ? 'disabled' : '';
  const near = nearbyBuilding(world);
  const error = colony.buildOpen ? placementError(world) : null;
  return `<label>COLONY GRID · ${colony.buildings.length} FACILITIES</label>
    <div class="resource"><span>Supply / demand</span><span>${colony.generation.toFixed(0)} / ${colony.demand.toFixed(0)} kW</span></div>
    <div class="resource"><span>Stored energy</span><span>${colony.energy.toFixed(1)} / ${energyCapacity(colony)} kJ</span></div>
    <div class="resource"><span>Ore storage</span><span>${inventoryMass(world.depot).toFixed(0)} / ${oreCapacity(colony)} kg</span></div>
    <div class="product-grid">${PRODUCTS.map(p => `<span>${p}<b>${colony.products[p].toFixed(1)}</b></span>`).join('')}</div>
    <button ${disabled} data-colony="toggleBuild">${colony.buildOpen ? 'Close build palette [B]' : 'Build palette [B] · on foot'}</button>
    ${colony.buildOpen ? `<div class="build-palette">${BUILD_TYPES.map((kind, i) => `<button ${disabled} class="${kind === colony.selected ? 'selected' : ''}" data-select="${kind}">${i + 1}. ${BLUEPRINTS[kind].label}<small>${Object.entries(BLUEPRINTS[kind].cost).map(([p, q]) => `${q} ${p}`).join(' · ')}</small></button>`).join('')}</div>
      <p class="placement ${error ? 'invalid' : ''}">${error ?? 'Site clear · place preview'}<br><small>Preview ${colony.offset} m along the rim</small></p>
      <div class="build-actions"><button ${disabled} data-shift="-32">← [Q]</button><button ${disabled} data-shift="32">→ [T]</button><button ${disabled || error ? 'disabled' : ''} data-colony="place">Place [Enter]</button></div>
      <button ${disabled} data-colony="demolish">Demolish nearby [X] · up to 75% salvage</button>` : ''}
    ${near ? `<div class="machine" data-hull="${buildingHealth(near).toFixed(1)}" data-aim="${(near.turret?.aim ?? 0).toFixed(3)}"><label>${BLUEPRINTS[near.kind].label}</label><p>Hull ${buildingHealth(near).toFixed(0)}% · ${near.status}${recipeFor(near) ? ` · ${recipeFor(near)!.label} · ${near.progress.toFixed(1)} s` : ''}</p>
      ${near.kind === 'storage' || near.kind === 'battery' ? `<p>${buildingHealth(near) > 0 ? 'Passive capacity · available' : 'Capacity lost · repair to restore'}</p>` : `<button ${disabled} data-colony="toggleMachine">${near.enabled ? 'Disable' : 'Enable'} nearby${near.kind === 'service' || isTurret(near.kind) ? '' : ' [E]'}</button>`}
      ${isTurret(near.kind) ? `<p>${WEAPONS[near.kind].range} m · ${WEAPONS[near.kind].energy} kJ/shot${WEAPONS[near.kind].alloy ? ` · ${WEAPONS[near.kind].alloy} alloy${WEAPONS[near.kind].components ? ` + ${WEAPONS[near.kind].components} components` : ''}` : ''}</p><button ${disabled} data-colony="controlTurret">${world.defence.controlled === near.id ? 'Release turret' : 'Control turret'} [E]</button><button ${disabled} data-colony="toggleAuto">Auto defence [G]: ${near.turret?.automatic ? 'on' : 'off'}</button>` : ''}
      <button ${disabled || buildingHealth(near) >= 100 ? 'disabled' : ''} data-colony="repairBuilding">Repair nearby [U] · 1 alloy / 10 hull</button>
      ${near.kind === 'service' ? '<p>E: suit service / repair / refuel</p>' : ''}
      ${near.kind === 'refinery' ? `<button ${disabled} data-colony="cycleRecipe">Next refinery recipe [V]</button>` : ''}</div>` : ''}
    ${colony.buildOpen ? `<div class="facility-list">${colony.buildings.map(b => `<div>${BLUEPRINTS[b.kind].label} · ${b.status} · ${buildingHealth(b).toFixed(0)}% hull</div>`).join('')}</div>` : ''}
    ${defencePanel(world, paused, threats)}
    <p class="checkpoint">K: save checkpoint · L: load<br><small>Manual local save · R keeps checkpoint</small></p>`;
}
export function actionFromButton(button: HTMLElement): ColonyAction | null {
  const { colony, select, shift } = button.dataset;
  if (select && BUILD_TYPES.includes(select as BuildType)) return { type: 'select', kind: select as BuildType };
  if (shift === '-32' || shift === '32') return { type: 'shift', delta: Number(shift) };
  if (colony && ['toggleBuild', 'place', 'demolish', 'toggleMachine', 'cycleRecipe', 'startWave', 'controlTurret', 'releaseTurret', 'toggleAuto', 'repairBuilding'].includes(colony)) return { type: colony } as ColonyAction;
  return null;
}
