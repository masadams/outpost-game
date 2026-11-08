import { BLUEPRINTS, BUILD_TYPES, type BuildType } from './colonyConfig';
import { notify } from './messages';
import { blueprintRevealed } from './unlocks';
import type { WorldState } from './world';

/** Blueprints already seen per world. Not saved: after a load the first look is the baseline, so nothing is re-announced. */
const seen = new WeakMap<WorldState, Set<BuildType>>();

/** Announces a blueprint the moment something that happened makes it available. Returns the new ones. */
export function stepBlueprintNotices(w: WorldState): BuildType[] {
  const known = seen.get(w);
  const now = BUILD_TYPES.filter(kind => blueprintRevealed(w, kind));
  if (!known) {
    seen.set(w, new Set(now));
    return [];
  }
  const fresh = now.filter(kind => !known.has(kind));
  for (const kind of fresh) {
    known.add(kind);
    notify(w, `NEW BLUEPRINT · ${BLUEPRINTS[kind].label.toUpperCase()}`);
  }
  return fresh;
}
