import type Phaser from 'phaser';
import { beaconPosition, podLane, podPosition } from '../sim/pods';
import { planetAt } from '../sim/celestial';
import type { Vec } from '../sim/math';
import type { WorldState } from '../sim/world';

/** How far from the viewer a pod or beacon is still worth drawing, in metres. */
const SEEN = 9000;

const near = (a: Vec, b: Vec): boolean => Math.hypot(a.x - b.x, a.y - b.y) < SEEN;

/**
 * Cargo pods and their beacons in the world: a flash and a streak at the launch, a glowing capsule with a trail all
 * the way across, a flash where it lands, and a pulsing beacon on the ground afterwards. Decoration only: every
 * position comes from the simulation.
 */
export function drawPods(g: Phaser.GameObjects.Graphics, w: WorldState, zoom: number, seconds: number): void {
  const viewer = w.playerMode === 'ship' ? w.ship.position : w.astronaut.position;
  const px = 1 / zoom;
  for (const pod of w.exploration.pods) {
    const lane = podLane(w, pod);
    const here = podPosition(w, pod);
    const age = w.system.time - pod.launched;
    const left = pod.arrives - w.system.time;
    if (!near(here, viewer) && !near(lane.from, viewer) && !near(lane.to, viewer)) continue;
    const ahead = podPosition(w, pod, w.system.time + 0.5);
    const heading = Math.atan2(ahead.y - here.y, ahead.x - here.x);
    const dx = Math.cos(heading);
    const dy = Math.sin(heading);
    // The lane, faint, so you can see where it is headed.
    g.lineStyle(px, 0xffd98a, 0.18);
    g.lineBetween(lane.from.x, lane.from.y, lane.up.x, lane.up.y);
    g.lineBetween(lane.up.x, lane.up.y, lane.over.x, lane.over.y);
    g.lineBetween(lane.over.x, lane.over.y, lane.to.x, lane.to.y);
    // A trail of where it was.
    for (let k = 1; k <= 10; k++) {
      const back = podPosition(w, pod, Math.max(pod.launched, w.system.time - k * 1.6));
      g.fillStyle(0xffc46b, 0.5 * (1 - k / 11));
      g.fillCircle(back.x, back.y, (3.2 - k * 0.2) * Math.max(1, px * 1.5));
    }
    // The capsule.
    const size = Math.max(4, 5 * px);
    g.fillStyle(0xfff1c4, 1);
    g.fillTriangle(here.x + dx * size, here.y + dy * size, here.x - dx * size * 0.7 - dy * size * 0.45, here.y - dy * size * 0.7 + dx * size * 0.45, here.x - dx * size * 0.7 + dy * size * 0.45, here.y - dy * size * 0.7 - dx * size * 0.45);
    g.fillStyle(0xffb347, 0.35);
    g.fillCircle(here.x, here.y, size * 1.6);
    // Launch: a flash and a streak off the ground.
    if (age < 8 && near(lane.from, viewer)) {
      const k = 1 - age / 8;
      g.fillStyle(0xffd27a, 0.4 * k * k);
      g.fillCircle(lane.from.x, lane.from.y, (6 + 22 * (1 - k)) * Math.max(1, px));
      g.lineStyle(3 * Math.max(1, px), 0xffe29a, 0.8 * k);
      g.lineBetween(lane.from.x, lane.from.y, here.x - dx * 6 * size * k, here.y - dy * 6 * size * k);
    }
    // Landing: the pod's own flash at the far end as it comes in.
    if (left < 8 && near(lane.to, viewer)) {
      const k = 1 - Math.max(0, left) / 8;
      g.lineStyle(2 * Math.max(1, px), 0xfff3c8, 0.6 * k);
      g.strokeCircle(lane.to.x, lane.to.y, (12 + 60 * k) * Math.max(1, px));
    }
  }
  for (const beacon of w.exploration.beacons ?? []) {
    const at = beaconPosition(w, beacon);
    if (!near(at, viewer)) continue;
    const body = planetAt(beacon.body, w.system);
    const up = { x: at.x - body.position.x, y: at.y - body.position.y };
    const length = Math.hypot(up.x, up.y) || 1;
    const ux = up.x / length;
    const uy = up.y / length;
    const color = beacon.kind === 'landed' ? 0x7fe6d3 : 0xff8f75;
    const pulse = 0.5 + 0.5 * Math.sin(seconds * 3);
    const lift = 60 * Math.max(1, px);
    g.lineStyle(2 * Math.max(1, px), color, 0.35 + 0.4 * pulse);
    g.lineBetween(at.x, at.y, at.x + ux * lift, at.y + uy * lift);
    g.fillStyle(color, 0.9);
    g.fillCircle(at.x + ux * lift, at.y + uy * lift, 3 * Math.max(1, px));
    g.lineStyle(px * 1.5, color, 0.5 * (1 - pulse));
    g.strokeCircle(at.x, at.y, (8 + 26 * pulse) * Math.max(1, px));
    if (beacon.kind === 'lost') {
      g.lineStyle(2 * Math.max(1, px), color, 0.9);
      g.lineBetween(at.x - 6 * px * 3, at.y - 6 * px * 3, at.x + 6 * px * 3, at.y + 6 * px * 3);
      g.lineBetween(at.x - 6 * px * 3, at.y + 6 * px * 3, at.x + 6 * px * 3, at.y - 6 * px * 3);
    }
  }
}
