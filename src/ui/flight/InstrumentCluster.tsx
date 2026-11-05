import type { AttitudeView, BarView, CautionView, FlightView, LimitView, ReadoutView } from './flightView';

export interface ClusterProps {
  view: FlightView;
  detailsOpen: boolean;
  autopilot: string | null;
  onToggleDetails: (byPointer: boolean) => void;
  onCancelAutopilot: () => void;
}

/** Bottom-centre flight cluster: reserves (bars), attitude dial and motion readouts. */
export function InstrumentCluster(props: ClusterProps) {
  const { view, detailsOpen, autopilot } = props;
  return (
    <div class="cluster" data-mode={view.mode}>
      <TouchdownStrip limits={view.limits} />
      <div class="cluster-head">
        <span class="instrument-mode">{view.title}</span>
        <Cautions cautions={view.cautions} />
        {autopilot && (
          <button type="button" class="autopilot-disengage" aria-label="Disengage autopilot" onClick={props.onCancelAutopilot}>
            {autopilot}
          </button>
        )}
        <button
          type="button"
          class="cluster-details"
          data-telemetry-toggle
          aria-label={detailsOpen ? 'Hide telemetry details' : 'Show telemetry details'}
          aria-expanded={detailsOpen}
          aria-controls="telemetry-details"
          onClick={event => props.onToggleDetails(event.detail > 0)}
        >
          {detailsOpen ? 'Details ▾' : 'Details ▴'}
        </button>
      </div>
      <div class="cluster-body">
        <section class="cluster-bars" aria-label="Reserves">
          {view.bars.map(bar => <Bar key={bar.key} bar={bar} />)}
        </section>
        {view.attitude && <AttitudeDial attitude={view.attitude} />}
        <section class="cluster-readouts" aria-label="Motion">
          {view.readouts.map(readout => <Readout key={readout.key} readout={readout} />)}
        </section>
      </div>
    </div>
  );
}

function Value(props: { value: string; unit: string }) {
  const unit = props.unit === '°' || props.unit === '%' ? props.unit : ` ${props.unit}`;
  return (
    <strong>
      {props.value}
      <small>{unit}</small>
    </strong>
  );
}

function describe(label: string, value: string, unit: string, note: string): string {
  return `${label}: ${value} ${unit}${note ? `. ${note}` : ''}`;
}

function Bar({ bar }: { bar: BarView }) {
  const instrument = bar.key === 'cargo' ? undefined : bar.key;
  return (
    <div
      class="cluster-bar"
      data-instrument={instrument}
      data-gauge={bar.key}
      data-level={bar.level}
      role="group"
      aria-label={describe(bar.label, bar.value, bar.unit, bar.note)}
    >
      <span class="cluster-label">{bar.label}</span>
      <span class="cluster-track">
        <i style={{ width: `${(bar.fraction * 100).toFixed(1)}%` }} />
      </span>
      <Value value={bar.value} unit={bar.unit} />
    </div>
  );
}

function Readout({ readout }: { readout: ReadoutView }) {
  return (
    <div
      class="cluster-readout"
      data-instrument={readout.key}
      data-level={readout.level}
      role="group"
      aria-label={describe(readout.label, readout.value, readout.unit, readout.note)}
    >
      <span class="cluster-label">{readout.label}</span>
      <Value value={readout.value} unit={readout.unit} />
    </div>
  );
}

/** Ship nose and direction of motion, both relative to local up (the top of the dial). */
function AttitudeDial({ attitude }: { attitude: AttitudeView }) {
  const label = `Attitude: nose ${attitude.value}° from local up${attitude.note ? `. ${attitude.note}` : ''}`;
  return (
    <section class="cluster-attitude" data-instrument="tilt" data-level={attitude.level} role="group" aria-label={label}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle class="att-face" cx="50" cy="50" r="46" />
        <circle class="att-ring" cx="50" cy="50" r="38" />
        <path class="att-up" d="M50 2 L46 10 L54 10 Z" />
        <path class="att-ticks" d="M50 12 V17 M88 50 H83 M50 88 V83 M12 50 H17" />
        {attitude.motion !== null && (
          <g class="att-motion" transform={`rotate(${attitude.motion.toFixed(1)} 50 50)`}>
            <line x1="50" y1="50" x2="50" y2="16" />
            <circle cx="50" cy="16" r="4" />
          </g>
        )}
        <g class="att-nose" transform={`rotate(${attitude.nose.toFixed(1)} 50 50)`}>
          <path d="M50 22 L61 60 L50 53 L39 60 Z" />
        </g>
      </svg>
      <span class="att-caption">
        <span class="cluster-label">Tilt</span>
        <Value value={attitude.value} unit="°" />
      </span>
      <span class="att-legend" aria-hidden="true">
        <span class="nose">Nose</span> · <span class="motion">Motion</span>
      </span>
    </section>
  );
}

function Cautions({ cautions }: { cautions: CautionView[] }) {
  return (
    <div class="instrument-lamps" aria-label="Active instrument cautions">
      {cautions.map(c => (
        <span key={c.key} data-caution={c.key} data-level={c.level} title={`${c.short}: ${c.label}`}>
          {c.level === 'critical' ? '!' : '▲'} {c.short}
        </span>
      ))}
    </div>
  );
}

/** Appears only on a landing approach: each touchdown limit turns green as you get inside it. */
function TouchdownStrip({ limits }: { limits: LimitView[] }) {
  if (!limits.length) return null;
  return (
    <div class="touchdown" role="group" aria-label="Touchdown limits">
      {limits.map(limit => (
        <div key={limit.key} class="touchdown-limit" data-limit={limit.key} data-level={limit.level}>
          <span class="cluster-label">{limit.label}</span>
          <strong>
            {limit.value}
            <small>{limit.unit === '°' ? '°' : ` ${limit.unit}`}</small>
          </strong>
          <span class="touchdown-max">max {limit.max}</span>
        </div>
      ))}
    </div>
  );
}
