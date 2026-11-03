export type HabitatKind = 'habitatSmall' | 'habitatLarge';
export interface HabitatState { oxygen: number; energy: number; powered: boolean; backup: boolean }
export const HABITATS = {
  habitatSmall: { label: 'Small habitat', halfSpan: 20, height: 20, capacity: 1, power: 2, fillRate: 0.2, leakRate: 0.002, cost: { alloy: 10, wire: 4, components: 2 } },
  habitatLarge: { label: 'Large habitat', halfSpan: 80, height: 45, capacity: 4, power: 4, fillRate: 0.4, leakRate: 0.008, cost: { alloy: 16, wire: 6, components: 4 } },
} as const;
export const HABITAT = { foundationHalfWidth: 1, backupSeconds: 10, minimumFraction: 0.15, warningFraction: 0.3, crewRate: 1 / 180 } as const;
export const isHabitat = (kind: string): kind is HabitatKind => kind === 'habitatSmall' || kind === 'habitatLarge';
export const createHabitat = (): HabitatState => ({ oxygen: 0, energy: 0, powered: false, backup: false });
