import { colonyPlanet } from '../sim/localWorld';
import type Phaser from 'phaser';
import { heading } from '../sim/math';
import { RESOURCE_INFO } from '../sim/resources';
import type { WorldState } from '../sim/world';

/** All visible strata stay inside the smooth physical rim; symbols distinguish the resource types. */
function drawGeologyLocal(g: Phaser.GameObjects.Graphics, world: WorldState, zoom: number): void {
  for (const d of world.surfaceDeposits) {
    const alpha = d.remaining > 0 ? 0.85 : 0.22, color = RESOURCE_INFO[d.resource].color;
    const count = 12; g.lineStyle(3, color, alpha); g.beginPath();
    for (let i = 0; i <= count; i++) {
      const n = heading(d.angle + (i / count * 2 - 1) * d.halfWidth / colonyPlanet(world).radius), r = colonyPlanet(world).radius - 6;
      if (i === 0) g.moveTo(n.x * r, n.y * r); else g.lineTo(n.x * r, n.y * r);
    }
    g.strokePath();
    if (zoom < 0.3) continue;
    const n = heading(d.angle), t = { x: -n.y, y: n.x }, p = (x: number, y: number) => ({ x: n.x * (colonyPlanet(world).radius - 15 + y) + t.x * x, y: n.y * (colonyPlanet(world).radius - 15 + y) + t.y * x });
    g.lineStyle(1 / Math.max(zoom, 0.5), color, alpha);
    if (d.resource === 'iron') g.strokePoints([p(-4, -4), p(4, -4), p(4, 4), p(-4, 4)], true);
    else if (d.resource === 'copper') g.strokePoints([p(0, 5), p(5, 0), p(0, -5), p(-5, 0)], true);
    else if (d.resource === 'silicon') g.strokePoints([p(0, 5), p(5, -4), p(-5, -4)], true);
    else {
      const a = p(-5, 0), b = p(5, 0), c = p(0, -5), e = p(0, 5);
      g.lineBetween(a.x, a.y, b.x, b.y); g.lineBetween(c.x, c.y, e.x, e.y);
      if (d.resource === 'rareMetals') { const f = p(-4, -4), h = p(4, 4), j = p(-4, 4), k = p(4, -4); g.lineBetween(f.x, f.y, h.x, h.y); g.lineBetween(j.x, j.y, k.x, k.y); }
    }
  }
}

export function drawGeology(g: Phaser.GameObjects.Graphics, world: WorldState, zoom: number): void {
  const p = colonyPlanet(world); g.save(); g.translateCanvas(p.position.x, p.position.y); g.rotateCanvas(p.spin);
  drawGeologyLocal(g, world, zoom); g.restore();
}
