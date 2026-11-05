import type Phaser from 'phaser';
import type { Vec } from '../sim/math';

/** A small chevron beside the lander, pointing at what the coach is talking about. */
export function drawCoachPointer(
  g: Phaser.GameObjects.Graphics,
  from: Vec,
  target: Vec,
  zoom: number,
  time: number,
  animate: boolean,
): void {
  const px = 1 / zoom;
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const distance = Math.hypot(dx, dy);
  // Close enough to see: the thing itself is the pointer.
  if (distance < 110 * px) return;
  const d = { x: dx / distance, y: dy / distance };
  const side = { x: -d.y, y: d.x };
  const bob = animate ? Math.sin(time * 5) * 3 : 0;
  const base = (62 + bob) * px;
  const tip = { x: from.x + d.x * (base + 9 * px), y: from.y + d.y * (base + 9 * px) };
  const left = { x: from.x + d.x * base + side.x * 6 * px, y: from.y + d.y * base + side.y * 6 * px };
  const right = { x: from.x + d.x * base - side.x * 6 * px, y: from.y + d.y * base - side.y * 6 * px };
  g.fillStyle(0x73f3cf, 0.75);
  g.fillTriangle(tip.x, tip.y, left.x, left.y, right.x, right.y);
}
