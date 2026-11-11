import { colonyPlanet } from '../sim/localWorld';
import type Phaser from 'phaser';
import { heading } from '../sim/math';
import { RESOURCE_INFO } from '../sim/resources';
import { seamGrade, seamKnown } from '../sim/geology';
import type { WorldState } from '../sim/world';

/** All visible strata stay inside the smooth physical rim; symbols distinguish the resource types. */
function drawGeologyLocal(g: Phaser.GameObjects.Graphics, world: WorldState, zoom: number): void {
  for (const d of world.surfaceDeposits) {
    const radius = colonyPlanet(world).radius;
    if (!seamKnown(d)) {
      // Not surveyed yet: a faint broken line and a question mark, no colour or amount.
      g.lineStyle(2, 0x8ea6b8, 0.45);
      for (let i = 0; i < 6; i += 2) {
        const a = heading(d.angle + (i / 6 * 2 - 1) * d.halfWidth / radius), b = heading(d.angle + ((i + 1) / 6 * 2 - 1) * d.halfWidth / radius);
        g.lineBetween(a.x * (radius - 6), a.y * (radius - 6), b.x * (radius - 6), b.y * (radius - 6));
      }
      if (zoom >= 0.3) {
        const n = heading(d.angle);
        g.lineStyle(1 / Math.max(zoom, 0.5), 0x8ea6b8, 0.6);
        g.strokeCircle(n.x * (radius - 15), n.y * (radius - 15), 4);
      }
      continue;
    }
    const alpha = d.remaining > 0 ? 0.85 : 0.22, color = RESOURCE_INFO[d.resource].color;
    // Richer seams are drawn thicker.
    const width = { poor: 2, normal: 3, rich: 4.5 }[seamGrade(d)];
    const count = 12; g.lineStyle(width, color, alpha); g.beginPath();
    for (let i = 0; i <= count; i++) {
      const n = heading(d.angle + (i / count * 2 - 1) * d.halfWidth / colonyPlanet(world).radius), r = colonyPlanet(world).radius - 6;
      if (i === 0) g.moveTo(n.x * r, n.y * r); else g.lineTo(n.x * r, n.y * r);
    }
    g.strokePath();
    // How much is left: a bar under the seam that shortens as it is worked.
    const share = d.initial > 0 ? d.remaining / d.initial : 0;
    if (share > 0 && share < 0.999) {
      g.lineStyle(1.5, color, 0.6);
      g.beginPath();
      for (let i = 0; i <= count; i++) {
        const n = heading(d.angle + (i / count * 2 - 1) * share * d.halfWidth / radius), r = radius - 10;
        if (i === 0) g.moveTo(n.x * r, n.y * r); else g.lineTo(n.x * r, n.y * r);
      }
      g.strokePath();
    }
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
