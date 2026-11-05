import { h, render } from 'preact';
import type { JSX } from 'preact';
import { Icon, type IconName } from './Icon';
import type { ObjectiveCardView, RegionView } from './chromeView';

export type ScreenPanel = 'cargo' | 'colony' | 'command' | 'navigation';
export type ViewAction = 'trajectory' | 'zoomIn' | 'zoomOut' | 'autoZoom';
export type SoundStatus = 'locked' | 'on' | 'muted' | 'unavailable';

export interface ChromeKeys {
  ship: string;
  build: string;
  mute: string;
  help: string;
  pause: string;
  path: string;
  zoomIn: string;
  zoomOut: string;
  autoZoom: string;
}

export interface ChromeState {
  objective: ObjectiveCardView;
  region: RegionView;
  panel: string | null;
  paused: boolean;
  sound: { status: SoundStatus; muted: boolean; audible: boolean; loops: number };
  camera: { mode: string; zoom: number; x: number; y: number; angle: number };
  trajectory: boolean;
  predictionPoints: number;
  keys: ChromeKeys;
}

export interface ChromeHandlers {
  objective: () => void;
  panel: (panel: ScreenPanel) => void;
  menu: () => void;
  soundPress: () => void;
  sound: () => void;
  help: () => void;
  settings: () => void;
  pause: () => void;
  view: (action: ViewAction) => void;
}

/** Return keyboard focus to the game after a mouse click; keyboard users keep focus on the control. */
function pointerClick(action: () => void) {
  return (event: JSX.TargetedMouseEvent<HTMLButtonElement>) => {
    action();
    if (event.detail > 0) event.currentTarget.blur();
  };
}

interface ScreenButtonProps {
  panel: ScreenPanel;
  icon: IconName;
  label: string;
  hotkey?: string;
  current: string | null;
  open: (panel: ScreenPanel) => void;
}

function ScreenButton(props: ScreenButtonProps) {
  const pressed = props.current === props.panel;
  return (
    <button
      type="button"
      class="screen-button"
      data-panel={props.panel}
      aria-pressed={pressed}
      aria-controls="operations-dock"
      onClick={pointerClick(() => props.open(props.panel))}
    >
      <Icon name={props.icon} />
      <span>{props.label}</span>
      {props.hotkey && <kbd aria-hidden="true">{props.hotkey}</kbd>}
    </button>
  );
}

interface ToolButtonProps {
  icon: IconName;
  label: string;
  hint: string;
  onClick: () => void;
  pressed?: boolean;
  disabled?: boolean;
  onPointerDown?: () => void;
}

function ToolButton(props: ToolButtonProps) {
  return (
    <button
      type="button"
      class="tool-button"
      aria-label={props.label}
      title={props.hint}
      aria-pressed={props.pressed}
      disabled={props.disabled}
      onPointerDown={props.onPointerDown}
      onClick={pointerClick(props.onClick)}
    >
      <Icon name={props.icon} />
    </button>
  );
}

function soundHint(status: SoundStatus, key: string): string {
  if (status === 'unavailable') return 'Sound is not available in this browser';
  if (status === 'locked') return 'Sound starts after your first click or key press';
  return status === 'muted' ? `Sound off · ${key} turns it on` : `Sound on · ${key} mutes`;
}

export function HudChrome({ state, on }: { state: ChromeState; on: ChromeHandlers }) {
  const { objective, keys, sound, camera } = state;
  return (
    <div class="chrome">
      <div class="chrome-left">
        <button
          type="button"
          id="objectives"
          class="objective-card"
          data-complete={objective.complete}
          aria-label="Open expedition objectives"
          aria-controls="operations-dock"
          aria-expanded={state.panel === 'objectives'}
          onClick={pointerClick(on.objective)}
        >
          <span class="objective-label">Objective · {objective.count}</span>
          <span class="objective-title">{objective.title}</span>
          <span class="objective-meter">
            <i style={{ width: `${(objective.fraction * 100).toFixed(0)}%` }} />
          </span>
          <span class="objective-detail">{objective.detail}</span>
        </button>
        <span id="flight-region" role="status" aria-live="polite" data-region={state.region.key}>
          {state.region.label}
        </span>
        {/* Status notices and target guidance are owned by the HUD and moved in here once. */}
        <div class="chrome-notices" />
      </div>

      <div class="chrome-right">
        <nav class="screens" aria-label="Screens">
          <ScreenButton panel="cargo" icon="ship" label="Ship" hotkey={keys.ship} current={state.panel} open={on.panel} />
          <ScreenButton panel="colony" icon="build" label="Build" hotkey={keys.build} current={state.panel} open={on.panel} />
          <ScreenButton panel="command" icon="base" label="Base" current={state.panel} open={on.panel} />
          <ScreenButton panel="navigation" icon="map" label="Map" current={state.panel} open={on.panel} />
          <button type="button" class="screen-button" aria-label="Open game menu" onClick={pointerClick(on.menu)}>
            <Icon name="menu" />
            <span>Menu</span>
            <kbd aria-hidden="true">Esc</kbd>
          </button>
        </nav>
        <div
          id="sound-panel"
          class="tray"
          data-status={sound.status}
          data-audible={String(sound.audible)}
          data-loops={String(sound.loops)}
        >
          <ToolButton
            icon={sound.status === 'on' ? 'sound' : 'muted'}
            label="Toggle sound mute"
            hint={soundHint(sound.status, keys.mute)}
            pressed={sound.muted}
            disabled={sound.status === 'unavailable'}
            onPointerDown={on.soundPress}
            onClick={on.sound}
          />
          <ToolButton icon="help" label="Open quick-start guide" hint={`How to play · ${keys.help}`} onClick={on.help} />
          <ToolButton icon="settings" label="Open settings" hint="Settings" onClick={on.settings} />
          <ToolButton
            icon={state.paused ? 'play' : 'pause'}
            label="Pause or resume game"
            hint={`${state.paused ? 'Resume' : 'Pause'} · ${keys.pause}`}
            pressed={state.paused}
            onClick={on.pause}
          />
        </div>
      </div>

      <div
        id="flight-tools"
        class="view-tools"
        data-trajectory={String(state.trajectory)}
        data-zoom-mode={camera.mode}
        data-zoom={camera.zoom.toFixed(3)}
        data-camera-x={camera.x.toFixed(5)}
        data-camera-y={camera.y.toFixed(5)}
        data-camera-angle={camera.angle.toFixed(6)}
        data-prediction-points={String(state.predictionPoints)}
      >
        <ToolButton
          icon="path"
          label="Coast path"
          hint={`Coast path ${state.trajectory ? 'on' : 'off'} · ${keys.path}`}
          pressed={state.trajectory}
          onClick={() => on.view('trajectory')}
        />
        <ToolButton icon="zoomOut" label="Zoom out" hint={`Zoom out · ${keys.zoomOut}`} onClick={() => on.view('zoomOut')} />
        <ToolButton icon="zoomIn" label="Zoom in" hint={`Zoom in · ${keys.zoomIn}`} onClick={() => on.view('zoomIn')} />
        <ToolButton
          icon="autoZoom"
          label="Auto zoom"
          hint={`Automatic zoom · ${keys.autoZoom}`}
          pressed={camera.mode === 'auto'}
          onClick={() => on.view('autoZoom')}
        />
        <span class="zoom-readout">
          {camera.mode} {camera.zoom.toFixed(2)}×
        </span>
      </div>
    </div>
  );
}

/** Owns the Preact root for the flight chrome. */
export class FlightChrome {
  readonly host = document.createElement('div');

  constructor(private handlers: ChromeHandlers) {
    this.host.id = 'hud-chrome';
  }

  update(state: ChromeState): void {
    render(h(HudChrome, { state, on: this.handlers }), this.host);
  }

  /** Flowing column under the objective card for HUD-owned notices. */
  adoptNotices(elements: HTMLElement[]): void {
    const slot = this.host.querySelector('.chrome-notices');
    if (!slot) return;
    for (const element of elements) if (element.parentElement !== slot) slot.append(element);
  }

  destroy(): void {
    render(null, this.host);
    this.host.remove();
  }
}
