import { WORLD } from './config';
import { SUIT } from './astronaut';
import { heading, type Vec } from './math';
export const STATIONS = [
  { kind: 'depot', label: 'Cargo depot', angle: 0.09, color: 0xf3d779 },
  { kind: 'service', label: 'Suit / hull service', angle: -0.09, color: 0x86e0ff },
] as const;
export const stationPosition = (angle: number): Vec => {
  const n = heading(angle); return { x: n.x * (WORLD.radius + SUIT.radius), y: n.y * (WORLD.radius + SUIT.radius) };
};
