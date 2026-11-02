import type Phaser from 'phaser';
import type { Trajectory } from '../sim/trajectory';
import type { Ship } from '../sim/physics';

export function drawTrajectory(g: Phaser.GameObjects.Graphics, prediction: Trajectory | null, ship: Ship, zoom: number): void {
  if (!prediction || ship.state !== 'flying') return;
  g.lineStyle(1.5 / zoom, 0x73f3cf, 0.7); g.beginPath();
  prediction.points.forEach((p, i) => { if (i % 6 >= 4 || i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); });
  g.strokePath();
  if (prediction.contact) {
    const { position, safe } = prediction.contact;
    g.lineStyle(1.5 / zoom, safe ? 0x73f3cf : 0xffb47c); g.strokeCircle(position.x, position.y, 7 / zoom);
    g.lineBetween(position.x - 10 / zoom, position.y, position.x + 10 / zoom, position.y);
    g.lineBetween(position.x, position.y - 10 / zoom, position.x, position.y + 10 / zoom);
  }
  const speed = Math.hypot(ship.velocity.x, ship.velocity.y);
  if (speed > 1) {
    const n = { x: ship.velocity.x / speed, y: ship.velocity.y / speed }, size = Math.min(90, speed * 1.1) / zoom;
    const x = ship.position.x + n.x * size, y = ship.position.y + n.y * size;
    g.lineStyle(1 / zoom, 0xa6e6ff, 0.8); g.lineBetween(ship.position.x, ship.position.y, x, y);
    g.lineBetween(x, y, x - n.x * 6 / zoom - n.y * 4 / zoom, y - n.y * 6 / zoom + n.x * 4 / zoom);
    g.lineBetween(x, y, x - n.x * 6 / zoom + n.y * 4 / zoom, y - n.y * 6 / zoom - n.x * 4 / zoom);
  }
}
