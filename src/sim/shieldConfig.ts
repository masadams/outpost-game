/** Protection points are a gameplay damage budget; stored grid energy is measured separately in kJ. */
export const SHIELDS = {
  shieldSmall: { radius: 60, capacity: 120, upkeep: 1, recharge: 4 },
  shieldLarge: { radius: 120, capacity: 360, upkeep: 2, recharge: 8 },
} as const;
export const SHIELD = { delay: 2, recovery: 5, rearmFraction: .25 } as const;
export type ShieldKind = keyof typeof SHIELDS;
export const isShield = (kind: string): kind is ShieldKind => kind === 'shieldSmall' || kind === 'shieldLarge';
export interface ShieldState { charge: number; powered: boolean; ready: boolean; delay: number; recovery: number; flash: number }
export const createShield = (): ShieldState => ({ charge: 0, powered: false, ready: false, delay: 0, recovery: 0, flash: 0 });
export const createShielding = () => ({ hits: 0, breaches: 0, absorbed: 0, dustMass: 0, dissipatedEnergy: 0, lostCharge: 0, energyUsed: 0 });
export type ShieldLedger = ReturnType<typeof createShielding>;
