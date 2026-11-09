import type Phaser from 'phaser';
import type { Planet } from '../sim/celestial';
import { natureOf, seasOf, treesOf } from '../sim/nature';
import { visible, type RenderView } from './budget';

/**
 * Seas and trees on a living world, drawn in the world's own turning frame. The caller has already moved the
 * graphics so world coordinates line up.
 */
export function drawNature(g: Phaser.GameObjects.Graphics, body: Planet, seed: number, view?: RenderView): void {
  const nature = natureOf(body.id);
  if (nature.water <= 0 && nature.trees <= 0) return;
  g.save();
  g.translateCanvas(body.position.x, body.position.y);
  g.rotateCanvas(body.spin);
  for (const sea of seasOf(body.id, seed)) {
    // A band of water just under the surface line, with a lighter shore line on top.
    const from = sea.angle - sea.half - Math.PI / 2;
    const to = sea.angle + sea.half - Math.PI / 2;
    g.lineStyle(10, 0x2f78b8, 0.9);
    g.beginPath();
    g.arc(0, 0, body.radius - 5, from, to);
    g.strokePath();
    g.lineStyle(1.5, 0x9fd8ff, 0.9);
    g.beginPath();
    g.arc(0, 0, body.radius - 0.5, from, to);
    g.strokePath();
  }
  for (const tree of treesOf(body.id, seed)) {
    const a = tree.angle - Math.PI / 2;
    // Skip trees off the screen (the view is in world space; the tree turns with the world).
    const w = a + body.spin;
    if (!visible(view, { x: body.position.x + Math.cos(w) * body.radius, y: body.position.y + Math.sin(w) * body.radius }, 30)) continue;
    const n = { x: Math.cos(a), y: Math.sin(a) };
    const t = { x: -n.y, y: n.x };
    const base = { x: n.x * body.radius, y: n.y * body.radius };
    const top = { x: n.x * (body.radius + tree.height), y: n.y * (body.radius + tree.height) };
    const crown = tree.height * 0.32;
    g.lineStyle(1.2, 0x5b4632, 1);
    g.lineBetween(base.x, base.y, base.x + n.x * tree.height * 0.4, base.y + n.y * tree.height * 0.4);
    g.fillStyle(0x3f8f55, 1);
    g.fillTriangle(
      top.x, top.y,
      base.x + n.x * tree.height * 0.3 + t.x * crown, base.y + n.y * tree.height * 0.3 + t.y * crown,
      base.x + n.x * tree.height * 0.3 - t.x * crown, base.y + n.y * tree.height * 0.3 - t.y * crown,
    );
  }
  g.restore();
}
