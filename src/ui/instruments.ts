import { fuelCapacity } from '../sim/shipStats';
import { HABITATS, isHabitat } from '../sim/habitatConfig';
import { habitatSource } from '../sim/habitats';
import { flightSafety, type FlightMetric, type InstrumentSafety } from '../sim/flightSafety';
import { telemetry } from '../sim/physics';
import { localAngle } from '../sim/math';
import { WORLD } from '../sim/config';
import { SUIT } from '../sim/astronaut';
import type { WorldState } from '../sim/world';

const symbol = { neutral: '', safe: '●', caution: '▲', critical: '!' } as const;
export function instrumentMarkup(world: WorldState): string {
  const onFoot = world.playerMode === 'astronaut', ship = world.ship;
  const t = onFoot ? telemetry({ ...world.astronaut, angle: localAngle(world.astronaut.position) }, SUIT.radius) : telemetry(ship);
  const safety = flightSafety(ship), habitat = habitatSource(world);
  const habitatPercent = habitat?.habitat && isHabitat(habitat.kind) ? habitat.habitat.oxygen / HABITATS[habitat.kind].capacity * 100 : 0;
  const rows: Array<[FlightMetric | 'oxygen' | 'suit' | 'footing', string, string]> = [
    ['altitude', 'ALTITUDE', `${t.altitude.toFixed(0)}<small> m</small>`], ['radial', 'RADIAL', `${t.radial.toFixed(1)}<small> m/s</small>`],
    ['drift', 'DRIFT', `${t.tangential.toFixed(1)}<small> m/s</small>`], ['speed', 'SPEED', `${t.speed.toFixed(1)}<small> m/s</small>`],
    [onFoot ? 'oxygen' : 'fuel', onFoot ? habitat ? 'HABITAT AIR' : 'SUIT AIR' : 'FUEL', `${(onFoot && habitat ? habitatPercent : (onFoot ? world.astronaut.oxygen / SUIT.oxygen : ship.fuel / fuelCapacity(ship)) * 100).toFixed(0)}<small> %</small>`],
    [onFoot ? 'suit' : 'hull', onFoot ? 'SUIT' : 'HULL', `${(onFoot ? world.astronaut.health : ship.hull).toFixed(0)}<small> %</small>`],
    [onFoot ? 'footing' : 'tilt', onFoot ? 'FOOTING' : 'TILT', onFoot ? world.astronaut.grounded ? 'GROUND' : 'AIR' : `${(t.tilt * 180 / Math.PI).toFixed(0)}<small> °</small>`],
  ];
  if (!onFoot) rows.push(['spin', 'SPIN', `${ship.angularVelocity.toFixed(2)}<small> rad/s</small>`]);
  return rows.map(([key, label, value]) => {
    let state: InstrumentSafety = onFoot ? { level: 'neutral', label: '' } : safety.instruments[key as FlightMetric];
    if (onFoot && key === 'oxygen') {
      if (habitat) state = {
        level: habitat.status === 'air low' || habitat.habitat?.backup ? 'caution' : 'safe',
        label: `${habitat.status === 'air low' ? 'AIR LOW · ' : ''}${habitat.habitat?.backup ? 'BACKUP · ' : ''}Suit ${(world.astronaut.oxygen / SUIT.oxygen * 100).toFixed(0)}% held`,
      };
      else if (world.astronaut.oxygen < 30) state = { level: 'critical', label: 'LOW SUIT AIR' };
    }
    return `<div data-instrument="${key}" data-level="${state.level}"><label>${label}</label><strong>${value}</strong><small class="instrument-status">${symbol[state.level]} ${state.label || '—'}</small></div>`;
  }).join('');
}
