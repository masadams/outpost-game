import Phaser from 'phaser';
import { heading, localAngle } from '../sim/math';
import { STATIONS } from '../sim/surface';
import { WORLD } from '../sim/config';
import type { WorldState } from '../sim/world';

export function drawSurface(g: Phaser.GameObjects.Graphics, world: WorldState): void {
  for (const station of STATIONS) {
    const n = heading(station.angle), tangent = { x: -n.y, y: n.x };
    const p = (x: number, height: number) => new Phaser.Geom.Point(n.x * (WORLD.radius + height) + tangent.x * x, n.y * (WORLD.radius + height) + tangent.y * x);
    g.fillStyle(0x203749); g.lineStyle(1, station.color);
    const shell = [p(-6, 0), p(-6, 11), p(4, 11), p(7, 7), p(7, 0)];
    g.fillPoints(shell, true); g.strokePoints(shell, true);
    g.fillStyle(station.color, 0.9);
    const screen = [p(-3, 4), p(-3, 8), p(3, 8), p(3, 4)]; g.fillPoints(screen, true);
    const start = p(-8, 0), end = p(9, 0); g.lineBetween(start.x, start.y, end.x, end.y);
    if (station.kind === 'service') {
      const a = p(-1, 5), b = p(1, 7); g.lineStyle(1, 0x203749); g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }
  if (world.playerMode !== 'astronaut') return;
  const suit = world.astronaut, n = heading(localAngle(suit.position)), tangent = { x: -n.y, y: n.x };
  const p = (x: number, y: number) => ({ x: suit.position.x + tangent.x * x + n.x * y, y: suit.position.y + tangent.y * x + n.y * y });
  const head = p(0, 2.8), torso = p(0, 0);
  const color = suit.health <= 0 ? 0xff8f75 : 0xe0eff2;
  g.lineStyle(1.6, color); g.fillStyle(0x3b667c); g.fillCircle(torso.x, torso.y, 2);
  g.fillStyle(color); g.fillCircle(head.x, head.y, 2.2);
  g.fillStyle(0x73f3cf); const visor = p(0.6, 3); g.fillCircle(visor.x, visor.y, 1.1);
  for (const side of [-1, 1]) {
    const foot = p(side * 1.4, -2.5), hand = p(side * 2.6, 0.3);
    g.lineBetween(torso.x, torso.y, foot.x, foot.y); g.lineBetween(torso.x, torso.y + 0.5, hand.x, hand.y);
  }
}
