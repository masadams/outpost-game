import type { BuildType } from '../../sim/colonyConfig';
import type { BodyId } from '../../sim/celestial';

/** A placement attempt under the mouse: where, what, and whether it is valid. */
export interface BuildDraft {
  kind: BuildType;
  angle: number;
  valid: boolean;
  body: BodyId;
  error: string | null;
  inputError?: string | null;
}
