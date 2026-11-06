import { stormKnowledge } from '../../sim/stormKnowledge';
import type { WorldState } from '../../sim/world';

export type StormTone = 'watching' | 'warning' | 'urgent';

export interface StormView {
  tone: StormTone;
  title: string;
  /** One or two short sentences. */
  detail: string;
}

/** "4 min 10 s", "35 s". */
export function duration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total} s`;
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
}

function where(corridor: number, margin: number): string {
  const side = corridor >= 0 ? 'right' : 'left';
  const away = Math.round(Math.abs(corridor) / 10) * 10;
  return `about ${away} m ${side} of the pad (give or take ${Math.round(margin / 10) * 10} m)`;
}

/** What the storm warning says right now, from what the Observatory has learned. Null when there is nothing to say. */
export function stormView(w: WorldState): StormView | null {
  const root = w.rootWorld ?? w;
  const storm = root.storm;
  if (!storm.armed || storm.phase !== 'approaching') return null;
  const known = stormKnowledge(root);
  const falling = root.defence.meteors.length > 0;
  if (!known) {
    if (storm.observed <= 0) return null;
    return { tone: 'watching', title: 'Scanning the sky', detail: 'Something may be out there. Keep the Observatory powered.' };
  }
  const when = `${duration(known.eta)} (give or take ${duration(known.etaMargin)})`;
  const count = known.level === 'sighted' ? 'Several rocks' : `${known.count} rocks`;
  if (falling) {
    return { tone: 'urgent', title: 'Rocks are coming down', detail: `${count}. Landing ${where(known.corridor, known.corridorMargin)}.` };
  }
  const urgent = known.eta < 90;
  const turrets = root.colony.buildings.some(b => b.kind === 'laser' || b.kind === 'flak' || b.kind === 'missile');
  const unguarded = turrets && (root.colony.policy?.energyReserve ?? 0) <= 0;
  const tip = unguarded ? ' Keep some power for the turrets in Base.' : '';
  return {
    tone: urgent ? 'urgent' : 'warning',
    title: known.level === 'precise' ? 'Storm tracked' : 'Debris detected',
    detail: `${count} arriving in ${when}. Landing ${where(known.corridor, known.corridorMargin)}.${tip}`,
  };
}
