import { describe, expect, it } from 'vitest';
// @ts-expect-error plain script without types
import { specsFor } from '../scripts/browser-tests.mjs';

declare global {
  interface ImportMeta {
    /** Vite's file listing, resolved when the tests are built. */
    glob(pattern: string): Record<string, unknown>;
  }
}

/** Spec names on disk, and every source file, without touching the file system at run time. */
const SPECS = Object.keys(import.meta.glob('./browser/*.spec.ts')).map(f => f.replace('./browser/', '').replace('.spec.ts', ''));
const SOURCES = Object.keys(import.meta.glob('../src/**/*')).map(f => f.replace('../', ''));

const names = (files: string[]): string[] => [...specsFor(files).specs.keys()].sort();

describe('choosing browser specs for a change', () => {
  it('runs nothing for docs and unit tests', () => {
    expect(specsFor(['docs/STORY.md', 'tests/story.test.ts', 'AGENTS.md'])).toMatchObject({ all: false });
    expect(names(['docs/STORY.md', 'tests/story.test.ts'])).toEqual([]);
  });

  it('runs the map specs and the smoke spec for a Map change', () => {
    expect(names(['src/ui/map/MapWindow.tsx'])).toEqual(['exploration', 'mapControls', 'pods', 'signal', 'smoke', 'worlds', 'wrecks']);
  });

  it('runs a changed spec, with the smoke spec', () => {
    expect(names(['tests/browser/story.spec.ts'])).toEqual(['smoke', 'story']);
  });

  it('runs everything for the centre of the game and for the shared spec helpers', () => {
    expect(specsFor(['src/render/FlightScene.ts']).all).toBe(true);
    expect(specsFor(['tests/browser/game.ts']).all).toBe(true);
    expect(specsFor(['docs/STORY.md', 'src/sim/world.ts']).all).toBe(true);
  });

  it('falls back to everything for a source file no rule covers', () => {
    const pick = specsFor(['src/sim/somethingNew.ts']);
    expect(pick.all).toBe(true);
    expect(pick.unknown).toEqual(['src/sim/somethingNew.ts']);
  });

  it('has a rule for every source file in the project', () => {
    expect(SOURCES.length).toBeGreaterThan(200);
    const unclassified = SOURCES.filter(f => specsFor([f]).unknown.length > 0);
    expect(unclassified).toEqual([]);
  });

  it('only names spec files that exist', () => {
    const existing = SPECS;
    expect(existing.length).toBeGreaterThan(30);
    const everySource = [
      'src/ui/map/x.ts', 'src/ui/base/x.ts', 'src/ui/build/x.ts', 'src/ui/flight/x.ts', 'src/ui/ship/x.ts', 'src/ui/GameMenu.ts',
      'src/ui/Objectives.ts', 'src/ui/console.css', 'src/ui/OperationsDock.ts', 'src/persistence/x.ts', 'src/audio/x.ts',
      'src/input/x.ts', 'src/render/ship.ts', 'src/sim/storm.ts', 'src/sim/signal.ts', 'src/sim/pods.ts', 'src/sim/story.ts',
      'src/sim/boot.ts', 'src/sim/habitats.ts', 'src/sim/shields.ts', 'src/sim/towing.ts', 'src/sim/wrecks.ts', 'src/sim/research.ts',
      'src/sim/autopilot.ts', 'src/sim/events.ts', 'src/sim/exploration.ts', 'src/sim/flightRegion.ts', 'src/sim/mining.ts',
      'src/sim/celestial.ts', 'src/sim/combat.ts', 'src/sim/astronaut.ts',
    ];
    for (const file of everySource) {
      const pick = specsFor([file]);
      expect(pick.all, file).toBe(false);
      for (const spec of pick.specs.keys()) expect(existing, `${file} -> ${spec}`).toContain(spec);
    }
  });
});
