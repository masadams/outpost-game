import { visible, type RenderView } from './budget';
import type Phaser from 'phaser';
import { heading } from '../sim/math';
import type { WorldState } from '../sim/world';
import { WORLD } from '../sim/config';
export function drawCombat(g: Phaser.GameObjects.Graphics, w: WorldState, zoom: number, reduced = false, view?: RenderView, detail=true): void {
  for (const d of w.combat.enemies) {
    if(!visible(view,d.position,30/zoom))continue;
    const n = heading(d.angle), r = { x: -n.y, y: n.x }, scale = Math.max(1, 0.65 / zoom);
    const point = (x: number, y: number) => ({ x: d.position.x + (r.x * x + n.x * y) * scale, y: d.position.y + (r.y * x + n.y * y) * scale });
    const color = d.state === 'retreat' ? 0xc7a1f4 : d.windup > 0 ? 0xff735e : 0xffbf80;
    const points = [point(0, 11), point(9, 0), point(5, -8), point(-5, -8), point(-9, 0)];
    g.fillStyle(0x492c38); g.lineStyle(1.4 / zoom, color); g.fillPoints(points, true); g.strokePoints(points, true);
    g.lineStyle(.7/zoom,color,.7);g.strokePoints([point(-7,0),point(-3,3),point(0,-3),point(3,3),point(7,0)],false);
    const at = point(0, 1); g.fillStyle(color); g.fillCircle(at.x, at.y, 2.5 / zoom);
    g.lineStyle(2 / zoom, color, 0.8); g.lineBetween(d.position.x - 12 / zoom, d.position.y - 18 / zoom, d.position.x + (24 * d.hull / 48 - 12) / zoom, d.position.y - 18 / zoom);
    if (d.windup > 0) { g.lineStyle(1 / zoom, 0xff735e, Math.min(0.8, d.windup)); g.lineBetween(d.position.x, d.position.y, w.ship.position.x, w.ship.position.y); g.strokeCircle(w.ship.position.x, w.ship.position.y, (12 + 12 * d.windup) / zoom); }
  }
  for (const p of w.combat.projectiles) { if(!visible(view,p.position,4/zoom))continue; g.fillStyle(p.owner === 'enemy' ? 0xff735e : p.kind === 'missile' ? 0xd8a9ff : 0x8bf5ff); g.fillCircle(p.position.x, p.position.y, (p.kind === 'missile' ? 3 : 2) / zoom); }
  for (const f of reduced ? [] : w.combat.flashes.slice(0,detail?12:4)) { if(!visible(view,f.position,24/zoom))continue; g.lineStyle(2 / zoom, 0xffd49b, Math.min(1, f.life * 4)); g.strokeCircle(f.position.x, f.position.y, (4 + (0.4 - f.life) * 36) / zoom); }
}
export function drawCombatRadar(g: Phaser.GameObjects.Graphics, w: WorldState, x: number, y: number, radius: number): void {
  for (const d of w.combat.enemies) { const r = Math.hypot(d.position.x, d.position.y), s = Math.min(radius / WORLD.radius, 61 / r); g.lineStyle(1, 0xff735e); g.strokeRect(x + d.position.x * s - 3, y + d.position.y * s - 3, 6, 6); }
}
