import { HABITATS, isHabitat } from '../sim/habitatConfig';
import { operational } from '../sim/buildingHealth';
import Phaser from 'phaser';
import { BLUEPRINTS, type BuildType } from '../sim/colonyConfig';
import { placementError, previewAngle } from '../sim/colony';
import { WORLD } from '../sim/config';
import { heading } from '../sim/math';
import type { WorldState } from '../sim/world';

export function drawColony(g: Phaser.GameObjects.Graphics, world: WorldState, selected: number | null = null, draft: { kind: BuildType; angle: number; valid: boolean } | null = null): void {
  const colony = world.colony;
  const target = colony.buildings.find(b => b.id === selected);
  if (target) { const n = heading(target.angle); g.lineStyle(1, 0xffc58c, .9); g.strokeCircle(n.x * (WORLD.radius + 12), n.y * (WORLD.radius + 12), 24); }
  for (const order of colony.command.queue) { const n = heading(order.angle); g.lineStyle(1, 0xffc58c, .5); g.strokeCircle(n.x * (WORLD.radius + 6), n.y * (WORLD.radius + 6), 8); }
  const entries = colony.buildings.map(b => ({ kind: b.kind, angle: b.angle, ghost: false, active: b.enabled && operational(b) && (!isHabitat(b.kind) || !!b.habitat?.powered) }));
  if (draft) entries.push({ kind: draft.kind, angle: draft.angle, ghost: true, active: draft.valid });
  if (!draft && colony.buildOpen && world.playerMode === 'astronaut') entries.push({ kind: colony.selected, angle: previewAngle(world), ghost: true, active: !placementError(world) });
  for (const entry of entries) {
    const blueprint = BLUEPRINTS[entry.kind], n = heading(entry.angle), tangent = { x: -n.y, y: n.x };
    const p = (x: number, height: number) => new Phaser.Geom.Point(n.x * (WORLD.radius + height) + tangent.x * x, n.y * (WORLD.radius + height) + tangent.y * x);
    const color = entry.ghost ? entry.active ? 0x73f3cf : 0xff8f75 : blueprint.color;
    if (isHabitat(entry.kind)) {
      const spec = HABITATS[entry.kind];
      const roof = Array.from({ length: 49 }, (_, i) => {
        const arc = -spec.halfSpan + 2 * spec.halfSpan * i / 48;
        const radial = heading(entry.angle + arc / WORLD.radius);
        const height = spec.height * Math.sqrt(Math.max(0, 1 - (arc / spec.halfSpan) ** 2));
        return new Phaser.Geom.Point(radial.x * (WORLD.radius + height), radial.y * (WORLD.radius + height));
      });
      g.fillStyle(color, entry.ghost ? 0.08 : 0.07); g.fillPoints(roof, true);
      g.lineStyle(1.5, color, entry.active ? 0.9 : 0.3); g.strokePoints(roof, false);
      for (const side of [-1, 1]) {
        const foot = heading(entry.angle + side * spec.halfSpan / WORLD.radius);
        g.fillStyle(color, 0.9); g.fillCircle(foot.x * WORLD.radius, foot.y * WORLD.radius, 2);
      }
      continue;
    }
    const width = blueprint.halfWidth;
    const outline = [p(-width, 0), p(-width, 13), p(width - 4, 13), p(width, 9), p(width, 0)];
    g.fillStyle(entry.ghost ? color : 0x203749, entry.ghost ? 0.12 : 0.95); g.fillPoints(outline, true);
    g.lineStyle(1, color, entry.active ? 0.95 : 0.4); g.strokePoints(outline, true);
    if (entry.kind === 'solar') {
      g.lineStyle(1, color); for (const x of [-8, -4, 0, 4, 8]) { const a = p(x, 4), b = p(x, 11); g.lineBetween(a.x, a.y, b.x, b.y); }
    } else if (entry.kind === 'miningRig') {
      const tower = [p(-8, 1), p(0, 29), p(8, 1)]; g.strokePoints(tower, false);
      for (const height of [7, 14, 21]) { const a = p(-5, height), b = p(5, height); g.lineBetween(a.x, a.y, b.x, b.y); }
      const drillTop = p(0, 19), drillBottom = p(0, -5); g.lineStyle(2, color); g.lineBetween(drillTop.x, drillTop.y, drillBottom.x, drillBottom.y);
    } else if (entry.kind === 'refinery') {
      const chimney = [p(-width + 2, 13), p(-width + 2, 21), p(-width + 5, 21), p(-width + 5, 13)]; g.strokePoints(chimney, true);
    } else {
      const a = p(-width + 3, 5), b = p(width - 3, 5); g.lineBetween(a.x, a.y, b.x, b.y);
      const c = p(-width + 3, 9), d = p(width - 3, 9); g.lineBetween(c.x, c.y, d.x, d.y);
    }
    const lamp = p(0, 15); g.fillStyle(color, entry.active ? 1 : 0.25); g.fillCircle(lamp.x, lamp.y, 1.4);
  }
}
