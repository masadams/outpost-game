import { nearestPlanet, relative, surfaceAngle } from './celestial';
import { GRADE_LABEL, SURVEY_FROM_AIR, SURVEY_ON_FOOT, seamGrade, seamKnown, type SurfaceDeposit } from './geology';
import { wrap } from './math';
import { notify } from './messages';
import { RESOURCE_INFO } from './resources';
import { colonyWorld } from './localWorld';
import type { WorldState } from './world';

/** Where the seams of the world under you are kept: home's on the world itself, others' on their outpost. */
export function depositsUnder(world: WorldState, at: { x: number; y: number }) {
  const planet = nearestPlanet(at, world.system);
  if (planet.id === 'home') return { planet, deposits: world.surfaceDeposits };
  const outpost = world.outposts[planet.id as keyof typeof world.outposts];
  return outpost ? { planet, deposits: outpost.surfaceDeposits } : null;
}

/** "Rich copper seam · 320 kg". */
export function seamLine(d: SurfaceDeposit): string {
  return `${GRADE_LABEL[seamGrade(d)]} ${RESOURCE_INFO[d.resource].label.toLowerCase()} seam · ${Math.round(d.remaining)} kg`;
}

/** Marks seams the pilot walks onto, or the lander passes low over, as surveyed. */
export function stepSurvey(source: WorldState): void {
  const world = source.rootWorld ?? source;
  const onFoot = world.playerMode === 'astronaut' && world.astronaut.grounded && world.astronaut.health > 0;
  const flying = world.playerMode === 'ship' && world.ship.state === 'flying';
  if (!onFoot && !flying) return;
  const at = onFoot ? world.astronaut.position : world.ship.position;
  const found = depositsUnder(world, at);
  if (!found) return;
  const { planet, deposits } = found;
  const height = Math.hypot(relative(at, planet).x, relative(at, planet).y) - planet.radius;
  if (flying && height > SURVEY_FROM_AIR.height) return;
  const angle = surfaceAngle(planet, at);
  const reach = onFoot ? SURVEY_ON_FOOT : SURVEY_FROM_AIR.reach;
  for (const d of deposits) {
    if (seamKnown(d)) continue;
    const gap = Math.abs(wrap(angle - d.angle)) * planet.radius - d.halfWidth;
    if (gap > reach) continue;
    d.surveyed = true;
    notify(world, `SEAM SURVEYED · ${seamLine(d).toUpperCase()}`, 5);
  }
}

/** How many of a world's seams are known. */
export function surveyCount(world: WorldState, body: string): { known: number; total: number } {
  const deposits = body === 'home' ? world.surfaceDeposits : colonyWorld(world, body as never).surfaceDeposits;
  return { known: deposits.filter(seamKnown).length, total: deposits.length };
}
