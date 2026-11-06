import { STATIC_SYSTEM, nearestPlanet, relative, relativeVelocity } from '../sim/celestial';
import { clamp, localAngle, wrap } from '../sim/math';
import { ATMOSPHERE, WORLD } from '../sim/config';
import { SUIT } from '../sim/astronaut';
import type { Vec } from '../sim/math';
interface FollowTarget { position: Vec; velocity?: Vec }

/** Physical height of the drawn lander and astronaut, in metres. */
export const SHIP_ART_HEIGHT = 14;
export const SUIT_ART_HEIGHT = 7.5;
/** How tall each should appear on screen when standing on the ground, as a fraction of viewport height. */
export const SHIP_SCREEN_FRACTION = 0.07;
export const SUIT_SCREEN_FRACTION = 0.049;
/** Where the focus point sits on screen, as a fraction of height from the top. Above centre, so there is ground to see below. */
export const FOCUS_Y = 0.4;
/** Pixels at the bottom of the screen covered by the instrument cluster and landing chips. */
export const HUD_BOTTOM_PX = 250;

/** Pixels below the focus point that are actually clear of the HUD. */
export function usableDepth(viewportHeight: number): number {
  return Math.max(0.15 * viewportHeight, viewportHeight * (1 - FOCUS_Y) - HUD_BOTTOM_PX);
}
/** Seconds of travel the camera looks ahead, and the most it may lead by (fraction of viewport height). */
const LOOK_AHEAD_SECONDS = 0.9;
const LOOK_AHEAD_MAX = 0.2;

/** Zoom at which the actor has its target on-screen size. Scales with the window, so size is the same on any display. */
export function groundZoom(viewportHeight: number, onFoot: boolean): number {
  const fraction = onFoot ? SUIT_SCREEN_FRACTION : SHIP_SCREEN_FRACTION;
  const height = onFoot ? SUIT_ART_HEIGHT : SHIP_ART_HEIGHT;
  return clamp((viewportHeight * fraction) / height, 1, 9);
}

/** Share of half the screen width, and of the space above the focus point, the work may use before the view zooms out to fit. */
const WORK_WIDTH_FRACTION = 0.36;
const WORK_ABOVE_FRACTION = 0.3;

/**
 * Highest zoom at which every point of interest is still comfortably on screen, given where the camera is
 * looking and how it is turned. Used to frame the rock being mined and the ore being pulled in.
 */
export function framingZoom(points: Vec[], centre: Vec, angle: number, viewportWidth: number, viewportHeight: number): number {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const above = WORK_ABOVE_FRACTION * viewportHeight;
  const below = usableDepth(viewportHeight);
  let zoom = Infinity;
  for (const p of points) {
    const dx = p.x - centre.x;
    const dy = p.y - centre.y;
    const sx = Math.abs(dx * cos + dy * sin);
    const sy = -dx * sin + dy * cos;
    if (sx > 1e-6) zoom = Math.min(zoom, (WORK_WIDTH_FRACTION * viewportWidth) / sx);
    if (sy < -1e-6) zoom = Math.min(zoom, above / -sy);
    if (sy > 1e-6) zoom = Math.min(zoom, below / sy);
  }
  return zoom;
}

/** Below this height the ground is always kept in view. */
const ALWAYS_SHOW_GROUND_BELOW = 120;
/** Seconds to ground contact at which the ground starts to matter, and at which it fully does. */
const CONTACT_NEAR = 7;
const CONTACT_FAR = 15;

/**
 * How much the ground below needs to be on screen, from 0 (not at all) to 1 (fully).
 * Driven by time to contact, so slowly drifting down while mining does not zoom the view out.
 */
export function groundUrgency(altitude: number, descentSpeed: number): number {
  if (altitude < ALWAYS_SHOW_GROUND_BELOW) return 1;
  if (descentSpeed <= 0.5) return 0;
  const timeToContact = altitude / descentSpeed;
  return clamp((CONTACT_FAR - timeToContact) / (CONTACT_FAR - CONTACT_NEAR), 0, 1);
}

/** Highest zoom that still shows the ground below a descending actor, with a margin. */
export function groundInViewZoom(viewportHeight: number, altitude: number): number {
  return usableDepth(viewportHeight) / (1.1 * Math.max(0, altitude) + 15);
}
export class FlightCamera {
  reducedMotion = false;
  rotate = true;
  /** Window height in pixels. The scene keeps this current. */
  viewportHeight = 900;
  viewportWidth = 1600;
  /** Things the pilot is working on (the rock under the laser, ore being pulled in). The view zooms in to frame them. */
  work: Vec[] = [];
  private workBlend = 0;
  x = 0; y = 0; angle = 0; zoom = 3.9;
  /** Smoothed look-ahead offset, in metres. */
  lead: Vec = { x: 0, y: 0 };
  private manualZoom: number | null = null;
  get mode(): 'auto' | 'manual' { return this.manualZoom === null ? 'auto' : 'manual'; }
  zoomBy(factor: number): void { if (Number.isFinite(factor) && factor > 0) this.manualZoom = clamp((this.manualZoom ?? this.zoom) * factor, 0.035, 12); }
  autoZoom(): void { this.manualZoom = null; }
  reset(ship: FollowTarget, system = STATIC_SYSTEM): void { this.x = ship.position.x; this.y = ship.position.y; this.angle = localAngle(relative(ship.position, nearestPlanet(ship.position, system))); this.zoom = groundZoom(this.viewportHeight, false); this.manualZoom = null; this.lead = { x: 0, y: 0 }; this.work = []; this.workBlend = 0; }
  update(ship: FollowTarget, dt: number, onFoot = false, system = STATIC_SYSTEM): void {
    const planet = nearestPlanet(ship.position, system), position = relative(ship.position, planet);
    const altitude = Math.max(0, Math.hypot(position.x, position.y) - planet.radius - (onFoot ? SUIT.radius : WORLD.shipRadius));
    const blend = clamp((altitude - ATMOSPHERE.height * 0.75) / (ATMOSPHERE.height * 0.75), 0, 1);
    const smooth = blend * blend * (3 - 2 * blend);
    // Smoothly blend the local frame into the fixed world frame, including at the angle seam.
    const targetAngle = !this.rotate || this.reducedMotion ? 0 : this.angle + wrap(localAngle(relative(ship.position, nearestPlanet(ship.position, system))) - this.angle) * (1 - smooth) + wrap(-this.angle) * smooth;
    // Look ahead in the direction of travel (relative to the ground), so there is more room in front than behind.
    const motion = ship.velocity ? relativeVelocity(ship.velocity, planet, ship.position) : { x: 0, y: 0 };
    const maxLead = (LOOK_AHEAD_MAX * this.viewportHeight) / Math.max(this.zoom, 1e-6);
    const speed = Math.hypot(motion.x, motion.y);
    const reach = Math.min(maxLead, speed * LOOK_AHEAD_SECONDS);
    const wanted = onFoot || this.reducedMotion || speed < 1e-6 ? { x: 0, y: 0 } : { x: (motion.x / speed) * reach, y: (motion.y / speed) * reach };
    const leadFollow = 1 - Math.exp(-1.5 * dt);
    this.lead = { x: this.lead.x + (wanted.x - this.lead.x) * leadFollow, y: this.lead.y + (wanted.y - this.lead.y) * leadFollow };
    const follow = 1 - Math.exp(-5 * dt);
    this.x += (ship.position.x + this.lead.x - this.x) * follow;
    this.y += (ship.position.y + this.lead.y - this.y) * follow;
    this.angle = !this.rotate || this.reducedMotion ? 0 : wrap(this.angle + wrap(targetAngle - this.angle) * (1 - Math.exp(-2.5 * dt)));
    const baseZoom = groundZoom(this.viewportHeight, onFoot);
    let wantedZoom = baseZoom / (1 + altitude / 240);
    const normal = Math.hypot(position.x, position.y) > 0 ? { x: position.x / Math.hypot(position.x, position.y), y: position.y / Math.hypot(position.x, position.y) } : { x: 0, y: -1 };
    const climbRate = motion.x * normal.x + motion.y * normal.y;
    // When ground contact is near, keep the ground below on screen. Far from the ground, or sinking slowly, the view stays close.
    // Frame the work: zoom in on what the laser or tractor is doing, as far as the lander's ground size,
    // but never so far that the work leaves the screen.
    this.workBlend += ((this.work.length > 0 && !onFoot ? 1 : 0) - this.workBlend) * (1 - Math.exp(-2.5 * dt));
    if (this.workBlend > 0.01 && this.work.length > 0) {
      const fit = framingZoom(this.work, { x: this.x, y: this.y }, this.angle, this.viewportWidth, this.viewportHeight);
      const framed = Math.min(baseZoom, fit);
      if (framed > wantedZoom) wantedZoom += (framed - wantedZoom) * this.workBlend;
    }
    const urgency = groundUrgency(altitude, -climbRate);
    if (urgency > 0) wantedZoom = wantedZoom + (Math.min(wantedZoom, groundInViewZoom(this.viewportHeight, altitude)) - wantedZoom) * urgency;
    const targetZoom = this.manualZoom ?? clamp(wantedZoom, 0.08, baseZoom);
    this.zoom += (targetZoom - this.zoom) * (1 - Math.exp(-3 * dt));
  }
}
