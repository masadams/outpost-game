import type Phaser from 'phaser';
import { WORLD } from '../sim/config';

/** Cache the unchanging geology; only moving actors and the pad need vector redraws. */
export function createPlanet(scene: Phaser.Scene): Phaser.GameObjects.Image {
  const key = 'planet-surface', size = 2048, extent = WORLD.radius + 2;
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, size, size)!;
    const c = texture.context;
    c.translate(size / 2, size / 2); c.scale(size / (2 * extent), size / (2 * extent));
    c.fillStyle = '#17282e'; c.strokeStyle = '#6a8b8b'; c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, WORLD.radius, 0, Math.PI * 2); c.fill(); c.stroke();
    c.strokeStyle = '#30464b'; c.lineWidth = 1;
    for (let i = 0; i < 100; i++) {
      const a = i * 2.399963, r = WORLD.radius - 40 - ((i * 137) % (WORLD.radius - 80));
      c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r, 4 + i % 19, 0, Math.PI * 2); c.stroke();
    }
    c.strokeStyle = '#466263'; c.beginPath();
    for (let i = 0; i < 360; i++) {
      const a = i * Math.PI / 180, x = Math.sin(a), y = -Math.cos(a);
      c.moveTo(x * (WORLD.radius - 10), y * (WORLD.radius - 10)); c.lineTo(x * (WORLD.radius - 2), y * (WORLD.radius - 2));
    }
    c.stroke(); texture.refresh();
  }
  return scene.add.image(0, 0, key).setDisplaySize(extent * 2, extent * 2);
}
