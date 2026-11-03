import { tractorStats } from '../sim/shipStats';
import Phaser from 'phaser';
import { MINING } from '../sim/mining';
import { RESOURCE_INFO } from '../sim/resources';
import { type WorldState } from '../sim/world';

export function drawMining(g: Phaser.GameObjects.Graphics, world: WorldState, zoom: number): void {
  for (const rock of world.asteroids) {
    const color = RESOURCE_INFO[rock.resource].color;
    const points = Array.from({ length: 9 }, (_, i) => {
      const angle = i / 9 * Math.PI * 2 + rock.id;
      const radius = rock.radius * (0.82 + ((rock.id * 13 + i * 7) % 11) / 60);
      return new Phaser.Geom.Point(rock.position.x + Math.cos(angle) * radius, rock.position.y + Math.sin(angle) * radius);
    });
    g.fillStyle(0x243443); g.fillPoints(points, true);
    g.lineStyle(1.2 / Math.max(zoom, 0.6), color, 0.85); g.strokePoints(points, true);
    g.fillStyle(color, 0.65); g.fillCircle(rock.position.x - rock.radius * 0.2, rock.position.y, 2.5);
    if (rock.health < rock.maxHealth) {
      g.lineStyle(2 / zoom, 0x73f3cf);
      g.lineBetween(rock.position.x - rock.radius, rock.position.y - rock.radius - 6,
        rock.position.x - rock.radius + rock.radius * 2 * Math.max(0, rock.health / rock.maxHealth), rock.position.y - rock.radius - 6);
    }
  }
  for (const ore of world.pickups) {
    g.fillStyle(RESOURCE_INFO[ore.resource].color); const size = Math.max(2, 2 / zoom);
    g.fillRect(ore.position.x - size, ore.position.y - size, size * 2, size * 2);
  }
  if (world.tractorActive) {
    g.lineStyle(1 / zoom, 0x73f3cf, 0.2); g.strokeCircle(world.ship.position.x, world.ship.position.y, tractorStats(world.ship).range);
    for (const ore of world.pickups) {
      if (Phaser.Math.Distance.BetweenPoints(world.ship.position, ore.position) > tractorStats(world.ship).range) continue;
      g.lineStyle(1 / zoom, 0x73f3cf, 0.4); g.lineBetween(world.ship.position.x, world.ship.position.y, ore.position.x, ore.position.y);
    }
  }
  if (world.beam) {
    const { start, end, targetId } = world.beam;
    g.lineStyle(5 / zoom, 0xffc27c, 0.15); g.lineBetween(start.x, start.y, end.x, end.y);
    g.lineStyle(1.5 / zoom, targetId === null ? 0xd8b485 : 0xffe7b0, 0.9); g.lineBetween(start.x, start.y, end.x, end.y);
    if (targetId !== null) { g.fillStyle(0xffecc1); g.fillCircle(end.x, end.y, 4 / zoom); }
  }
}
