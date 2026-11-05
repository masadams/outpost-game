import { colonyPlanet } from '../sim/localWorld';
import Phaser from 'phaser';
import { heading } from '../sim/math';
import { STATIONS } from '../sim/surface';
import { drawAstronaut } from './astronaut';
import type { WorldState } from '../sim/world';

export function drawSurface(g: Phaser.GameObjects.Graphics, world: WorldState, time = 0): void {
  const body = colonyPlanet(world);
  for (const station of (world.siteBody === 'moon' ? STATIONS.filter(s => s.kind === 'depot').map(s => ({ ...s, angle: 54 / body.radius })) : STATIONS)) {
    const n = heading(station.angle), tangent = { x: -n.y, y: n.x };
    const p = (x: number, height: number) => new Phaser.Geom.Point(body.position.x + n.x * (body.radius + height) + tangent.x * x, body.position.y + n.y * (body.radius + height) + tangent.y * x);
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
  drawAstronaut(g, world, time);
}
