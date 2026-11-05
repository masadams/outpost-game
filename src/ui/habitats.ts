import { colonyPlanet } from '../sim/localWorld';
import { HABITATS, HABITAT, isHabitat } from '../sim/habitatConfig';
import { habitatContains, habitatSource } from '../sim/habitats';
import type { Building } from '../sim/colony';
import type { WorldState } from '../sim/world';
export function habitatDetails(b: Building): string {
  if (!isHabitat(b.kind) || !b.habitat) return '';
  const s = HABITATS[b.kind], h = b.habitat;
  return `<p>Coverage ${s.halfSpan * 2} m · roof ${s.height} m<br>Oxygen ${h.oxygen.toFixed(2)} / ${s.capacity} kg · ${b.status}<br>Life support ${s.power} kW · backup ${(h.energy / s.power).toFixed(1)} / ${HABITAT.backupSeconds} s${h.backup ? ' · BACKUP ACTIVE' : ''}</p><small>Uses colony oxygen. Suit reserve holds while breathing here; no suit refill or healing. Damaged seals leak faster. Not a shield.</small>`;
}
export function habitatNotice(w: WorldState): string {
  const b = habitatSource(w);
  if (b?.habitat && isHabitat(b.kind)) return `HABITAT AIR · ${b.status === 'air low' ? 'AIR LOW · ' : ''}${b.habitat.backup ? `BACKUP ${(b.habitat.energy / HABITATS[b.kind].power).toFixed(1)} s · ` : ''}SUIT RESERVE HELD`;
  if (w.colony.buildings.some(b => isHabitat(b.kind) && habitatContains(b, w.astronaut.position, colonyPlanet(w)))) return 'HABITAT AIR UNAVAILABLE · USING SUIT RESERVE';
  return 'Walk with A/D, jump with Space, press F to board the lander.';
}
