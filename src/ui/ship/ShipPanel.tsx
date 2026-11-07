import type { ShipPanelView } from './shipView';

/** Cargo and depot in plain words. Shown in the Ship window and, on foot, as the depot view. */
export function ShipPanelContent({ view }: { view: ShipPanelView }) {
  return (
    <div class="ship-panel" data-full={String(view.cargo.full)}>
      <section class="ship-cargo" aria-label="Hold">
        <div class="ship-cargo-head">
          <span>Hold</span>
          <strong>
            {view.cargo.value}
            <small> / {view.cargo.capacity} kg</small>
          </strong>
        </div>
        <span class="ship-meter" aria-hidden="true">
          <i style={{ width: `${(view.cargo.fraction * 100).toFixed(0)}%` }} />
        </span>
      </section>

      <p class="ship-next" role="status">
        {view.next}
      </p>

      <table class="ship-ore">
        <thead>
          <tr>
            <th scope="col">Ore</th>
            <th scope="col">In hold</th>
            <th scope="col">At the depot</th>
          </tr>
        </thead>
        <tbody>
          {view.ore.map(r => (
            <tr key={r.resource} data-ore={r.resource}>
              <th scope="row">{r.label}</th>
              <td>{r.hold} kg</td>
              <td>{r.stored} kg</td>
            </tr>
          ))}
        </tbody>
      </table>

      {view.kit && (
        <section class="ship-kit" aria-label="Nacre kit">
          <h3>Nacre kit</h3>
          <p>{view.kit.text}</p>
          {view.kit.load && (
            <>
              <button type="button" data-kit="load" disabled={!view.kit.load.enabled}>
                Load rig kit
              </button>
              <small>{view.kit.load.reason}</small>
            </>
          )}
        </section>
      )}
      {view.haul && (
        <section class="ship-kit" aria-label="Haul ore home">
          <h3>Haul ore home</h3>
          <p>{view.haul.text}</p>
          <button type="button" data-haul="load" disabled={!view.haul.enabled}>
            Load ore
          </button>
          <small>{view.haul.reason}</small>
        </section>
      )}
      {view.deposit && (
        <section class="ship-target" aria-label="Nearest rock">
          <h3>Nearest rock</h3>
          <p>
            {view.deposit.label} · {view.deposit.distance}
          </p>
          <small>
            {view.deposit.direction}. Laser reaches {view.deposit.laserRange}.
          </small>
        </section>
      )}
      {view.foot ? (
        <section class="surface-panel" aria-label="On foot">
          <h3>On foot</h3>
          <p class="ship-next">{view.foot.status}</p>
          <ul class="ship-places">
            {view.foot.places.map(p => (
              <li key={p.label}>
                <span>{p.label}</span>
                <strong>{p.distance}</strong>
              </li>
            ))}
          </ul>
          <p>{view.foot.action}</p>
          <small>{view.foot.note}</small>
          {view.depot && <p class="ship-next" data-tone="info">Depot open. Your ore totals are above.</p>}
        </section>
      ) : (
        <small class="ship-tools">{view.tools}</small>
      )}
    </div>
  );
}
