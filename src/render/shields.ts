import type Phaser from 'phaser';
import { SHIELDS, isShield } from '../sim/shieldConfig';
import { shieldActive } from '../sim/shields';
import { WORLD } from '../sim/config';
import { heading } from '../sim/math';
import type { WorldState } from '../sim/world';
/** Static lines and a short colour accent; no strobe or animated pulse. */
export function drawShields(g: Phaser.GameObjects.Graphics, w: WorldState, accents = true): void {
  for (const b of w.colony.buildings) {
    if (!isShield(b.kind) || !b.shield || (b.health ?? 100) <= 0) continue;
    const spec = SHIELDS[b.kind], h = b.shield, n = heading(b.angle), centre = { x: n.x * WORLD.radius, y: n.y * WORLD.radius };
    const active = shieldActive(b);
    g.lineStyle(active ? 1.6 : 1, accents && h.flash > 0 ? 0xffc58c : active ? 0x92b7ff : 0x77829e, active ? .65 : .22);
    g.beginPath();
    // The planet occludes the subterranean half of this surface-centred sphere.
    let started = false;
    for (let i = 0; i <= 96; i++) {
      const a = i / 96 * Math.PI * 2, x = centre.x + Math.cos(a) * spec.radius, y = centre.y + Math.sin(a) * spec.radius;
      if (Math.hypot(x, y) < WORLD.radius) { started = false; continue; }
      if (!started) { g.moveTo(x, y); started = true; } else g.lineTo(x, y);
    }
    g.strokePath();
    const tangent = { x: -n.y, y: n.x }, base = { x: n.x * (WORLD.radius + 19), y: n.y * (WORLD.radius + 19) };
    g.lineStyle(2.5, active ? 0x92b7ff : 0xffc58c, .9); g.lineBetween(base.x - tangent.x * 8, base.y - tangent.y * 8, base.x + tangent.x * (-8 + 16 * h.charge / spec.capacity), base.y + tangent.y * (-8 + 16 * h.charge / spec.capacity));
  }
}
