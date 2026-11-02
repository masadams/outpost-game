export interface Vec { x: number; y: number }
export const length = (v: Vec): number => Math.hypot(v.x, v.y);
export const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;
export const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));
export const heading = (angle: number): Vec => ({ x: Math.sin(angle), y: -Math.cos(angle) });
export const localAngle = (v: Vec): number => Math.atan2(v.x, -v.y);
export const clamp = (v: number, low: number, high: number): number => Math.max(low, Math.min(high, v));
