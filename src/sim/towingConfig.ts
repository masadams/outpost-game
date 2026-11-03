export const TOW = { range: 180, minimumLength: 12, relativeSpeed: 15, spring: 90, damping: 80, breakForce: 6000, stretch: 35, mass: 25,
  cost: { alloy: 16, wire: 6, components: 3 } } as const;
export interface TowingState { targetId: number | null; length: number; tension: number; breaks: number }
export type TowAction = { type: 'toggleTow' | 'installTowRig' };
export const createTowing = (): TowingState => ({ targetId: null, length: 0, tension: 0, breaks: 0 });
