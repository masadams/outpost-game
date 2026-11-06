import { WORLD } from '../../sim/config';
import { flightSafety, type SafetyLevel } from '../../sim/flightSafety';
import { colonyPlanet } from '../../sim/localWorld';
import { landingLimits as touchdownLimits, telemetry } from '../../sim/physics';
import { cargoMass } from '../../sim/shipMass';
import { cargoCapacity } from '../../sim/shipStats';
import type { WorldState } from '../../sim/world';
import { gaugeFraction, instrumentReadings, type InstrumentKey, type InstrumentReading } from '../instruments';

/** Everything the flight cluster shows, derived from the simulation. Pure: no DOM, no Phaser. */
export interface FlightView {
  mode: 'ship' | 'crew';
  title: string;
  bars: BarView[];
  attitude: AttitudeView | null;
  readouts: ReadoutView[];
  limits: LimitView[];
  cautions: CautionView[];
}

export interface Measure {
  value: string;
  unit: string;
}

export interface BarView extends Measure {
  key: InstrumentKey | 'cargo';
  label: string;
  fraction: number;
  level: SafetyLevel;
  note: string;
}

export interface ReadoutView extends Measure {
  key: InstrumentKey;
  label: string;
  level: SafetyLevel;
  note: string;
}

export interface AttitudeView extends Measure {
  /** Nose direction, degrees clockwise from local up. */
  nose: number;
  /** Direction of motion, degrees clockwise from local up; null when nearly still. */
  motion: number | null;
  level: SafetyLevel;
  note: string;
}

export interface LimitView extends Measure {
  key: 'radial' | 'drift' | 'tilt';
  label: string;
  max: string;
  level: SafetyLevel;
}

export interface CautionView {
  key: InstrumentKey;
  short: string;
  label: string;
  level: SafetyLevel;
}

const MOTION_THRESHOLD = 0.3;
const RAD_TO_DEG = 180 / Math.PI;

/** Value and unit with km scaling and a typographic sign for signed quantities. */
export function measure(reading: Pick<InstrumentReading, 'value' | 'unit' | 'digits' | 'min'>): Measure {
  if (typeof reading.value !== 'number') return { value: reading.value, unit: reading.unit };
  const large = (reading.unit === 'm' || reading.unit === 'm/s') && Math.abs(reading.value) >= 1000;
  const scaled = large ? reading.value / 1000 : reading.value;
  const digits = large ? 1 : reading.digits;
  const unit = large ? (reading.unit === 'm' ? 'km' : 'km/s') : reading.unit;
  const text = Math.abs(scaled).toFixed(digits);
  const signed = reading.min < 0 && Number(text) !== 0;
  const sign = signed ? (scaled > 0 ? '+' : '−') : '';
  return { value: sign + text, unit };
}


function find(rows: InstrumentReading[], key: InstrumentKey): InstrumentReading {
  const row = rows.find(r => r.key === key);
  if (!row) throw new Error(`Missing instrument reading: ${key}`);
  return row;
}

function bar(row: InstrumentReading, label: string): BarView {
  return { key: row.key, label, fraction: gaugeFraction(row), level: row.state.level, note: row.state.label, ...measure(row) };
}

function readout(row: InstrumentReading, label: string): ReadoutView {
  return { key: row.key, label, level: row.state.level, note: row.state.label, ...measure(row) };
}

function cargoBar(w: WorldState): BarView {
  const mass = cargoMass(w.ship);
  const capacity = cargoCapacity(w.ship);
  const full = mass >= capacity - 1e-6;
  return {
    key: 'cargo',
    label: 'Cargo',
    fraction: capacity > 0 ? Math.min(1, mass / capacity) : 0,
    level: full ? 'caution' : 'neutral',
    note: full ? 'HOLD FULL' : '',
    value: mass.toFixed(0),
    unit: 'kg',
  };
}

function landingLimits(w: WorldState): LimitView[] {
  const safety = flightSafety(w.ship, w.system);
  if (!safety.approach) return [];
  const t = telemetry(w.ship, WORLD.shipRadius, w.system);
  return [
    {
      key: 'radial',
      label: 'Descent',
      value: Math.max(0, -t.radial).toFixed(1),
      unit: 'm/s',
      max: `${touchdownLimits(safety.onPad).radial}`,
      level: safety.instruments.radial.level,
    },
    {
      key: 'drift',
      label: 'Drift',
      value: Math.abs(t.tangential).toFixed(1),
      unit: 'm/s',
      max: `${touchdownLimits(safety.onPad).tangential}`,
      level: safety.instruments.drift.level,
    },
    {
      key: 'tilt',
      label: 'Tilt',
      value: (t.tilt * RAD_TO_DEG).toFixed(0),
      unit: '°',
      max: `${Math.round(touchdownLimits(safety.onPad).tilt * RAD_TO_DEG)}°`,
      level: safety.instruments.tilt.level,
    },
  ];
}

function attitude(w: WorldState, row: InstrumentReading): AttitudeView {
  const t = telemetry(w.ship, WORLD.shipRadius, w.system);
  const moving = t.speed >= MOTION_THRESHOLD;
  return {
    nose: row.attitude ?? 0,
    motion: moving ? Math.atan2(t.tangential, t.radial) * RAD_TO_DEG : null,
    level: row.state.level,
    note: row.state.label,
    value: Math.abs(row.attitude ?? 0).toFixed(0),
    unit: '°',
  };
}

function titleFor(w: WorldState): string {
  const body = colonyPlanet(w).label.toUpperCase();
  if (w.playerMode === 'astronaut') return `EVA · ${body} · ${w.astronaut.grounded ? 'GROUND' : 'AIR'}`;
  if (w.ship.state === 'landed') return `LANDED · ${body}`;
  if (w.ship.state === 'crashed') return `WRECKED · ${body}`;
  return `${flightSafety(w.ship, w.system).approach ? 'LANDING' : 'FLIGHT'} · ${body}`;
}

export function flightView(w: WorldState): FlightView {
  const rows = instrumentReadings(w);
  const cautions = rows
    .filter(r => r.key !== 'speed' && (r.state.level === 'caution' || r.state.level === 'critical'))
    .map(r => ({ key: r.key, short: r.short, label: r.state.label, level: r.state.level }));

  if (w.playerMode === 'astronaut') {
    const air = find(rows, 'oxygen');
    return {
      mode: 'crew',
      title: titleFor(w),
      bars: [bar(air, air.short === 'HABITAT AIR' ? 'Habitat air' : 'Suit air'), bar(find(rows, 'suit'), 'Suit')],
      attitude: null,
      readouts: [readout(find(rows, 'altitude'), 'Altitude'), readout(find(rows, 'speed'), 'Speed')],
      limits: [],
      cautions,
    };
  }

  return {
    mode: 'ship',
    title: titleFor(w),
    bars: [bar(find(rows, 'fuel'), 'Fuel'), bar(find(rows, 'hull'), 'Hull'), cargoBar(w)],
    attitude: attitude(w, find(rows, 'tilt')),
    readouts: [
      readout(find(rows, 'altitude'), 'Altitude'),
      readout(find(rows, 'radial'), 'Vertical'),
      readout(find(rows, 'drift'), 'Drift'),
    ],
    limits: landingLimits(w),
    cautions,
  };
}
