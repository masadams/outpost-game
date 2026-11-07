import Phaser from 'phaser';
import { SITE_INFO, BELTS, BELT_IDS, type BeltId } from '../sim/explorationConfig';
import { courseTo } from '../sim/intercept';
import { navigation, destination } from '../sim/exploration';
import type { WorldState } from '../sim/world';
export function drawExploration(g: Phaser.GameObjects.Graphics, w: WorldState, zoom: number): void {
  for (const s of w.exploration.sites) {
    const color = s.health > 0 ? SITE_INFO[s.key].color : 0x677586, p = s.position;
    g.lineStyle(1 / zoom, color, .9);
    if (s.key === 'cache') { g.strokeRect(p.x - 8, p.y - 5, 16, 10); g.lineBetween(p.x - 5, p.y - 5, p.x + 5, p.y + 5); }
    else if (s.key === 'tender') { g.strokeCircle(p.x, p.y, 8); g.lineBetween(p.x - 16, p.y, p.x + 16, p.y); }
    else { const vertices = [new Phaser.Geom.Point(p.x, p.y - 8), new Phaser.Geom.Point(p.x + 8, p.y), new Phaser.Geom.Point(p.x, p.y + 8), new Phaser.Geom.Point(p.x - 8, p.y)]; g.strokePoints(vertices, true); }
    g.fillStyle(color, .7); g.fillCircle(p.x, p.y, 2 / zoom);
  }
  const n = navigation(w), p = n.position;
  if (w.exploration.selected !== 'home') { g.lineStyle(1 / zoom, 0xf3d779, .9); g.strokeCircle(p.x, p.y, 16 / zoom); }
  // Belts move on: ring where the one you picked will be when you get there.
  const selected = w.exploration.selected;
  const course = courseTo(w, selected);
  if (course) {
    const aim = course.aim;
    g.lineStyle(1 / zoom, 0x9fe4ff, .8);
    g.strokeCircle(aim.x, aim.y, 24 / zoom);
    g.strokeCircle(aim.x, aim.y, 3 / zoom);
  }
  // A local arrow remains in view even when the destination and its chart position are far away.
  if (n.range > 100) {
    const viewer = w.playerMode === 'ship' ? w.ship.position : w.astronaut.position, dx = (p.x - viewer.x) / n.range, dy = (p.y - viewer.y) / n.range;
    const x = viewer.x + dx * 75 / zoom, y = viewer.y + dy * 75 / zoom, size = 6 / zoom;
    g.lineStyle(1.5 / zoom, 0xf3d779, .9); g.lineBetween(x - dx * size - dy * size, y - dy * size + dx * size, x, y); g.lineBetween(x, y, x - dx * size + dy * size, y - dy * size - dx * size);
  }
}
export function drawExplorationRadar(g: Phaser.GameObjects.Graphics, w: WorldState, x: number, y: number, scale: number): void {
  for (const s of w.exploration.sites) {
    const magnitude = Math.hypot(s.position.x, s.position.y), k = Math.min(scale, 61 / magnitude);
    g.lineStyle(1, SITE_INFO[s.key].color, .9); g.strokeCircle(x + s.position.x * k, y + s.position.y * k, s.key === w.exploration.selected ? 4 : 2.5);
  }
  const p = destination(w).position, k = Math.min(scale, 61 / Math.max(1, Math.hypot(p.x, p.y)));
  g.lineStyle(1, 0xf3d779); g.strokeCircle(x + p.x * k, y + p.y * k, 5);
}
