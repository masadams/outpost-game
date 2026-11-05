import { useState } from 'preact/hooks';
import type { JSX } from 'preact';

function click(action: () => void) {
  return (event: JSX.TargetedMouseEvent<HTMLButtonElement>) => {
    action();
    if (event.detail > 0) event.currentTarget.blur();
  };
}

export interface DemolishProps {
  label: string;
  salvage: string;
  blocked: string | null;
  disabled?: boolean;
  onConfirm: () => void;
}

/** A Demolish button that asks first: "Demolish Solar array? You get back 3 alloy." */
export function Demolish({ label, salvage, blocked, disabled, onConfirm }: DemolishProps) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button
        type="button"
        class="danger"
        disabled={disabled || blocked !== null}
        title={blocked ?? undefined}
        onClick={click(() => setAsking(true))}
      >
        Demolish…
      </button>
    );
  }
  return (
    <div class="confirm" role="alertdialog" aria-label={`Demolish ${label}?`}>
      <p>
        Demolish {label}? You get back {salvage}.
      </p>
      <button type="button" class="danger" onClick={click(() => { setAsking(false); onConfirm(); })}>
        Demolish
      </button>
      <button type="button" onClick={click(() => setAsking(false))}>
        Keep it
      </button>
    </div>
  );
}
