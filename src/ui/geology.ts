import { colonyPlanet, localAngleAt } from '../sim/localWorld';
import { RIG, depositAt, rigDeposit, surfaceDistance } from '../sim/geology';
import { RESOURCE_INFO } from '../sim/resources';
import { wrap } from '../sim/math';
import { previewAngle, type Building } from '../sim/colony';
import type { WorldState } from '../sim/world';

export function geologyPanel(world: WorldState): string {
  if (world.playerMode !== 'astronaut') return '<div class="ground-survey"><label>PLANETARY MINING</label><small>Leave the ship and inspect marked surface seams in the Colony panel.</small></div>';
  const crewAngle = localAngleAt(world, world.astronaut.position), selecting = world.colony.buildOpen && world.colony.selected === 'miningRig';
  const site = selecting ? previewAngle(world) : crewAngle;
  const nearest = [...world.surfaceDeposits].sort((a, b) => surfaceDistance(a.angle, site) - surfaceDistance(b.angle, site))[0];
  const covered = depositAt(world.surfaceDeposits, site, 12, colonyPlanet(world).radius), distance = Math.abs(wrap(nearest.angle - crewAngle)) * colonyPlanet(world).radius;
  const bearing = wrap(nearest.angle - crewAngle) < 0 ? 'left' : 'right';
  return `<div class="ground-survey" data-deposit="${nearest.id}" data-resource="${nearest.resource}" data-remaining="${nearest.remaining.toFixed(2)}">
    <label>SURFACE SURVEY · SEAM ${nearest.id}</label>
    <div>${RESOURCE_INFO[nearest.resource].label} · ${distance.toFixed(0)} m ${bearing}</div>
    <small>Reserve ${nearest.remaining.toFixed(1)} / ${nearest.initial} kg · footprint ${nearest.halfWidth * 2} m</small>
    ${selecting ? `<p class="${covered && covered.remaining > 0 ? 'placement' : 'warning'}">${covered ? covered.remaining > 0 ? 'Rig footprint covers this seam' : 'This seam is exhausted' : 'Move the preview onto a marked seam'}</p>` : ''}
    <small>Build palette → Mining rig · ${RIG.power} kW · ${RIG.yield} kg / ${RIG.seconds} s. All deposits are finite.</small>
  </div>`;
}
export function rigDetails(world: WorldState, building: Building): string {
  if (building.kind !== 'miningRig') return '';
  const d = rigDeposit(world.surfaceDeposits, building, colonyPlanet(world).radius);
  return `<p class="rig-output">${d ? `${RESOURCE_INFO[d.resource].label} · seam ${d.id} · ${d.remaining.toFixed(1)} kg left` : 'No valid seam linked'}<br><small>${RIG.power} kW · ${RIG.yield} kg every ${RIG.seconds} s · ${building.progress.toFixed(1)} s into cycle</small></p>`;
}
