import type Phaser from 'phaser';
import type { WorldState } from '../sim/world';
import { TOW } from '../sim/towingConfig';
export function drawTowing(g: Phaser.GameObjects.Graphics, w: WorldState, zoom: number): void {
  const rock = w.asteroids.find(r => r.id === w.towing.targetId); if (!rock) return;
  const stretch = Math.max(0, Math.hypot(rock.position.x - w.ship.position.x, rock.position.y - w.ship.position.y) - w.towing.length);
  const strain = Math.max(w.towing.tension / TOW.breakForce, stretch / TOW.stretch);
  const color = strain > 0.9 ? 0xff958b : strain > 0.7 ? 0xf3d779 : 0x8ce9dd;
  g.lineStyle(1.5 / zoom, color, 0.9); g.lineBetween(w.ship.position.x, w.ship.position.y, rock.position.x, rock.position.y);
  g.strokeCircle(rock.position.x, rock.position.y, rock.radius + 5 / zoom);
}
