import type { WorldState } from '../sim/world';
export type DockView = 'cargo' | 'colony' | 'combat' | 'defence' | 'command' | 'navigation';
export interface HudContext { key: string; label: string; view: DockView | null; hint: string }
/** Presentation decisions only; changing panels never changes the simulation. */
export function hudContext(w: WorldState): HudContext {
  if (w.ship.state === 'crashed' && w.playerMode === 'ship') return { key: 'recovery', label: 'Recovery', view: 'combat', hint: 'Backspace recover · L checkpoint · R reset · H help' };
  if (w.colony.buildOpen && w.playerMode === 'astronaut') return { key: 'construction', label: 'Construction', view: 'colony', hint: '1–9 blueprint · Q/T shift · Enter place · X salvage · B close' };
  if (w.defence.controlled !== null) return { key: 'turret', label: 'Turret', view: 'defence', hint: 'A/D aim · Space fire · E release · G auto defence · P pause' };
  if (w.playerMode === 'ship' && w.combat.enemies.length) return { key: 'combat', label: 'Combat', view: 'combat', hint: 'Shift fire · Z weapon · A/D turn · W thrust · P pause · H help' };
  if (w.defence.meteors.length) return { key: 'defence', label: 'Defence', view: 'defence', hint: 'N next drill when clear · I cargo · P pause · H help' };
  if (w.playerMode === 'astronaut' && w.depotOpen) return { key: 'depot', label: 'Depot', view: 'cargo', hint: 'E close depot · A/D walk · F board · B build · P pause' };
  if (w.playerMode === 'astronaut') return { key: 'surface', label: 'Surface', view: 'colony', hint: 'A/D walk · Space jump · E interact · F board · B build · H help' };
  return { key: 'flight', label: w.ship.state === 'landed' ? 'On pad' : 'Flight', view: null, hint: 'W thrust · A/D turn · Space mine · Shift fire · F exit · I cargo · P pause' };
}
