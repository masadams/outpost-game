import { h, render } from 'preact';
import type { JSX } from 'preact';
import { Icon, type IconName } from './Icon';
import type { ObjectiveCardView, RegionView } from './chromeView';
import type { PickupLine } from './pickupFeed';
import type { StormView } from './stormView';
import type { DayView } from './dayView';
import type { WreckCard } from './wreckView';

export type ScreenPanel = 'cargo' | 'colony' | 'command' | 'navigation';
export type ViewAction = 'scan' | 'grid' | 'trajectory' | 'zoomIn' | 'zoomOut' | 'autoZoom';
export type SoundStatus = 'locked' | 'on' | 'muted' | 'unavailable';

export interface ChromeKeys {
  ship: string;
  build: string;
  mute: string;
  help: string;
  save: string;
  pause: string;
  path: string;
  zoomIn: string;
  zoomOut: string;
  autoZoom: string;
  scan: string;
}

export interface ChromeState {
  objective: ObjectiveCardView;
  region: RegionView;
  panel: string | null;
  paused: boolean;
  sound: { status: SoundStatus; muted: boolean; audible: boolean; loops: number };
  camera: { mode: string; zoom: number; x: number; y: number; angle: number };
  pickups: PickupLine[];
  storm: StormView | null;
  day: DayView | null;
  event: { label: string; detail: string; active: boolean } | null;
  wreck: WreckCard | null;
  /** The waking log at the very start of a new game. */
  boot: readonly string[] | null;
  /** A story entry that has just come back, shown until read or timed out. */
  story: { id: string; title: string; text: string; chapter: string; more: number } | null;
  /** Story entries not read yet. */
  unread: number;
  trajectory: boolean;
  /** Whether the power lines are drawn over the base. */
  grid: boolean;
  /** The ground scan button; null hides it. */
  scan: { block: string | null; unknown: number } | null;
  predictionPoints: number;
  keys: ChromeKeys;
}

export interface ChromeHandlers {
  objective: () => void;
  /** Opens the Journal from the story card. */
  story: () => void;
  /** Puts the story card away. */
  storyDismiss: () => void;
  panel: (panel: ScreenPanel) => void;
  menu: () => void;
  soundPress: () => void;
  sound: () => void;
  help: () => void;
  settings: () => void;
  save: () => void;
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
      {state.boot && (
        <div class="boot-log" role="status" aria-label="Waking log">
          {state.boot.map((line, i) => (
            <p key={line} style={{ animationDelay: `${i * 0.9}s` }}>{line}</p>
          ))}
        </div>
      )}
      {!state.boot && state.story && state.panel === null && (
        <div class="story-card" role="status" aria-label="Journal entry" data-story={state.story.id}>
          <span class="story-eyebrow">
            Journal · {state.story.chapter}
            {state.story.more > 0 && <small> · {state.story.more} more</small>}
          </span>
          <strong>{state.story.title}</strong>
          <p>{state.story.text}</p>
          <span class="story-actions">
            <button type="button" data-story-open onClick={pointerClick(on.story)}>Open Journal</button>
            <button type="button" data-story-dismiss onClick={pointerClick(on.storyDismiss)}>Dismiss</button>
          </span>
        </div>
      )}
      {state.storm?.tone === 'urgent' && <div class="storm-vignette" aria-hidden="true" />}
      <div class="chrome-left">
        <button
          type="button"
          id="objectives"
          class="objective-card"
          data-complete={objective.complete}
          data-quiet={!objective.visible}
          aria-label="Open expedition objectives"
          aria-controls="operations-dock"
          aria-expanded={state.panel === 'objectives'}
          onClick={pointerClick(on.objective)}
        >
          <span class="objective-label">
            {objective.visible ? 'Objective' : objective.count}
            {state.unread > 0 && <i class="objective-new" data-unread={state.unread}>{state.unread} new in Journal</i>}
          </span>
          {objective.visible && <span class="objective-title">{objective.title}</span>}
          {objective.visible && (
            <span class="objective-meter">
              <i style={{ width: `${(objective.fraction * 100).toFixed(0)}%` }} />
            </span>
          )}
          {objective.visible && <span class="objective-detail">{objective.detail}</span>}
        </button>
        {state.event && (
          <span id="flight-event" data-active={state.event.active}>
            <i aria-hidden="true" />
            {state.event.label} · {state.event.detail}
          </span>
        )}
        {state.day && (
          <span id="flight-daylight" data-phase={state.day.phase} title={state.day.detail}>
            <i aria-hidden="true" />
            {state.day.label} · {state.day.detail}
          </span>
        )}
        {state.wreck && (
          <section class="storm-card" data-tone="watching" role="status" aria-live="polite" data-wreck>
            <span class="storm-title">{state.wreck.title}</span>
            <span class="storm-detail">{state.wreck.detail}</span>
          </section>
        )}
        {state.storm && (
          <section class="storm-card" data-tone={state.storm.tone} role="status" aria-live="polite">
            <span class="storm-title">{state.storm.title}</span>
            <span class="storm-detail">{state.storm.detail}</span>
          </section>
        )}
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
          <ToolButton icon="save" label="Quick save" hint={`Quick save · ${keys.save}`} onClick={on.save} />
          <ToolButton icon="settings" label="Open settings" hint="Settings" onClick={on.settings} />
          <ToolButton
            icon="grid"
            label="Power lines"
            hint={`Power lines ${state.grid ? 'on' : 'off'}`}
            pressed={state.grid}
            onClick={() => on.view('grid')}
          />
          <ToolButton
            icon={state.paused ? 'play' : 'pause'}
            label="Pause or resume game"
            hint={`${state.paused ? 'Resume' : 'Pause'} · ${keys.pause}`}
            pressed={state.paused}
            onClick={on.pause}
          />
        </div>
      </div>

      <ul class="pickup-feed" aria-live="polite" aria-label="Collected">
        {state.pickups.map(line => (
          <li key={line.key} data-resource={line.key} style={{ opacity: line.fade }}>
            {line.text}
          </li>
        ))}
      </ul>

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
        {state.scan && (
          <ToolButton
            icon="scan"
            label="Ground scan"
            hint={state.scan.block ?? `Scan the ground for ore seams · ${keys.scan} · ${state.scan.unknown} not found yet`}
            pressed={false}
            onClick={() => on.view('scan')}
          />
        )}
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
