import { streamFor } from './seed';
import type { Resource } from './resources';
import type { SystemEcho } from './signal';

export type WorldKind = 'rocky' | 'ice' | 'gas' | 'molten' | 'desert';

/** One world of the far system. The beacon only said how many; expeditions find out what they are. */
export interface FarWorld {
  index: number;
  name: string;
  kind: WorldKind;
  air: 'none' | 'thin' | 'thick';
  /** Extra danger of the last leg, down to the ground. Gas worlds have none to land on. */
  landRisk: number;
  landable: boolean;
  /** What a landing brings home, as shares of the haul. */
  haul: Partial<Record<Resource, number>>;
}

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

const KINDS: Record<WorldKind, Pick<FarWorld, 'landRisk' | 'landable' | 'haul'> & { airs: FarWorld['air'][] }> = {
  rocky: { landRisk: 0.2, landable: true, haul: { iron: 0.5, silicon: 0.3, copper: 0.2 }, airs: ['none', 'thin'] },
  ice: { landRisk: 0.25, landable: true, haul: { ice: 0.8, rareMetals: 0.2 }, airs: ['none', 'thin'] },
  desert: { landRisk: 0.2, landable: true, haul: { silicon: 0.6, copper: 0.3, ice: 0.1 }, airs: ['thin', 'thick'] },
  molten: { landRisk: 0.45, landable: true, haul: { rareMetals: 0.6, iron: 0.4 }, airs: ['none', 'thick'] },
  gas: { landRisk: 0.6, landable: false, haul: {}, airs: ['thick'] },
};

/** The worlds of the far system, the same every time for a save. */
export function farWorlds(seed: number, echo: SystemEcho): FarWorld[] {
  const rand = streamFor(seed, 'signal/worlds');
  const kinds = Object.keys(KINDS) as WorldKind[];
  return Array.from({ length: echo.worlds }, (_, index) => {
    const kind = kinds[Math.floor(rand() * kinds.length)];
    const spec = KINDS[kind];
    return {
      index,
      name: `${echo.name} ${NUMERALS[index]}`,
      kind,
      air: spec.airs[Math.floor(rand() * spec.airs.length)],
      landRisk: spec.landRisk,
      landable: spec.landable,
      haul: spec.haul,
    };
  });
}

export const kindWord = (w: FarWorld): string =>
  `${w.kind === 'gas' ? 'gas giant' : `${w.kind} world`}${w.air === 'none' ? ', no air' : w.air === 'thin' ? ', thin air' : ', thick air'}`;
