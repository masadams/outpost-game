import { STATIC_SYSTEM, nearestPlanet, relative, surfaceAngle } from './celestial';
import { fuelCapacity } from './shipStats';
import { WORLD } from './config';
import { localAngle, wrap } from './math';
import { landingLimits, telemetry, type Ship } from './physics';

export type SafetyLevel = 'neutral' | 'safe' | 'caution' | 'critical';
export interface InstrumentSafety { level: SafetyLevel; label: string }
export const FLIGHT_METRICS = ['altitude', 'radial', 'drift', 'speed', 'fuel', 'hull', 'tilt', 'spin'] as const;
export type FlightMetric = typeof FLIGHT_METRICS[number];
export interface FlightSafety {
  approach: boolean; urgent: boolean; onPad: boolean;
  instruments: Record<FlightMetric, InstrumentSafety>;
  message: string; level: SafetyLevel;
}
const neutral = (): InstrumentSafety => ({ level: 'neutral', label: '' });
function limit(value: number, maximum: number, high: string): InstrumentSafety {
  return value > maximum ? { level: 'critical', label: high } : value > maximum * 0.7 ? { level: 'caution', label: 'NEAR LIMIT' } : { level: 'safe', label: 'WITHIN LIMIT' };
}
export function flightSafety(ship: Ship, system = STATIC_SYSTEM): FlightSafety {
  const t = telemetry(ship, WORLD.shipRadius, system), descending = Math.max(0, -t.radial), contactSeconds = descending > 0 ? t.altitude / descending : Infinity;
  const approach = ship.state === 'flying' && t.radial <= 0.5 && (t.altitude <= 300 || t.altitude <= 800 && contactSeconds <= 10);
  const onPad = Math.abs(wrap(surfaceAngle(nearestPlanet(ship.position, system), ship.position) - WORLD.padAngle)) * nearestPlanet(ship.position, system).radius <= WORLD.padHalfWidth;
  const instruments: Record<FlightMetric, InstrumentSafety> = {
    altitude: neutral(), radial: neutral(), drift: neutral(), speed: neutral(), tilt: neutral(), spin: neutral(),
    fuel: ship.fuel <= fuelCapacity(ship) * 0.05 ? { level: 'critical', label: ship.fuel <= 0 ? 'EMPTY' : 'FUEL CRITICAL' } : ship.fuel <= fuelCapacity(ship) * 0.15 ? { level: 'caution', label: 'LOW FUEL' } : { level: 'safe', label: 'FUEL OK' },
    hull: ship.hull <= 25 ? { level: 'critical', label: 'HULL CRITICAL' } : ship.hull <= 50 ? { level: 'caution', label: 'HULL LOW' } : { level: 'safe', label: 'HULL OK' },
  };
  const problems: string[] = [];
  if (approach) {
    const l = landingLimits(onPad);
    instruments.radial = limit(descending, l.radial, 'DESCENT HIGH');
    instruments.drift = limit(Math.abs(t.tangential), l.tangential, 'DRIFT HIGH');
    instruments.tilt = limit(t.tilt, l.tilt, 'TILT HIGH');
    instruments.spin = limit(Math.abs(ship.angularVelocity), l.spin, 'SPIN HIGH');
    for (const key of ['radial', 'drift', 'tilt', 'spin'] as const) if (instruments[key].level === 'critical') problems.push(instruments[key].label);
    instruments.speed = instruments.radial.level === 'critical' || instruments.drift.level === 'critical' ? { level: 'critical', label: 'BRAKE' } :
      instruments.radial.level === 'caution' || instruments.drift.level === 'caution' ? { level: 'caution', label: 'NEAR LIMIT' } : { level: 'safe', label: 'WITHIN LIMIT' };
    const danger = problems.length > 0;
    instruments.altitude = { level: t.altitude <= 30 && danger ? 'critical' : t.altitude <= 100 ? 'caution' : 'safe', label: t.altitude <= 30 && danger ? 'LOW · CORRECT' : t.altitude <= 100 ? 'LOW ALTITUDE' : 'APPROACH' };
  }
  const urgent = approach && problems.length > 0 && (t.altitude <= 100 || contactSeconds <= 5);
  const ground = onPad ? '' : ' · ROUGH GROUND';
  const landing = approach ? problems.length ? `LANDING${ground} · ${problems.join(' · ')}` : `APPROACH${ground} · WITHIN TOUCHDOWN LIMITS` : '';
  const fuel = ship.state !== 'crashed' && instruments.fuel.level !== 'safe' ? instruments.fuel.label : '';
  return { approach, urgent, onPad, instruments, message: [landing, fuel].filter(Boolean).join(' · '),
    level: urgent || fuel && instruments.fuel.level === 'critical' ? 'critical' : problems.length || fuel ? 'caution' : approach ? 'safe' : 'neutral' };
}
