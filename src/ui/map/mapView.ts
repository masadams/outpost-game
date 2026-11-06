import { nacreSurvey } from '../../sim/nacreSurvey';
import { featureVisible } from '../../preferences/features';
import { planetAt, planets, surfacePosition } from '../../sim/celestial';
import { WORLD } from '../../sim/config';
import { farPosition } from '../../sim/storm';
import { stormKnowledge } from '../../sim/stormKnowledge';
import { wreckMarks } from '../flight/wreckView';
import { BELTS, BELT_IDS, SITE_INFO, SITE_IDS, type BeltId, type Destination, type SiteId } from '../../sim/explorationConfig';
import { destination, navigation, siteError } from '../../sim/exploration';
import { inventoryMass, RESOURCES, RESOURCE_INFO } from '../../sim/resources';
import type { Vec } from '../../sim/math';
import type { WorldState } from '../../sim/world';

/** Everything the Map window shows, derived from the simulation. Pure: no DOM, no Phaser. */
export interface MapView {
  bodies: BodyMark[];
  belts: BeltMark[];
  sites: SiteMark[];
  ship: Vec;
  pad: Vec;
  places: PlaceView[];
  selected: SelectedView;
  /** World-space box that holds everything worth showing. */
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  note: string;
  /** What the Observatory knows of an incoming storm; null when nothing is known. */
  storm: StormMark | null;
  /** Lost landers whose transponders are still on. */
  wrecks: Array<{ id: number; at: Vec; label: string }>;
}

/** Rocks still far away are drawn at the edge of the chart, pointing the way they come from. */
export interface StormMark {
  rocks: Array<{ at: Vec; offChart: boolean; distance: number }>;
  /** How uncertain each position is, in metres. */
  doubt: number;
  /** Where it expects them to land, and how wide that guess is. */
  zone: { at: Vec; radius: number } | null;
  line: string;
}

export interface BodyMark { id: string; label: string; at: Vec; radius: number; atmosphere: number }
export interface BeltMark { id: BeltId; label: string; color: string; rocks: Array<{ at: Vec; ore: boolean }> }
export interface SiteMark { id: SiteId; label: string; at: Vec; intact: boolean }

export interface PlaceView {
  id: Destination;
  label: string;
  at: Vec;
  kind: string;
  selected: boolean;
}

export interface SelectedView {
  id: Destination;
  label: string;
  kind: string;
  /** e.g. "Surveyed", "Not surveyed", "Your outpost". */
  state: string;
  facts: Array<[string, string]>;
  body: string;
  /** Site interaction (salvage, refuel, survey) when the selection is a site. */
  action: { label: string; enabled: boolean; reason: string } | null;
  blocked: boolean;
}

const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;
const fmt = (n: number) => n.toFixed(1);

function kindOf(id: Destination): string {
  if (id === 'home') return 'Your outpost';
  if (id === 'moon') return 'Moon';
  if ((BELT_IDS as readonly string[]).includes(id)) return 'Ore cluster';
  return 'Site';
}

function beltStock(w: WorldState, belt: BeltId): string {
  const bodies = [...w.asteroids, ...w.pickups].filter(r => r.belt === belt);
  const parts = RESOURCES.flatMap(r => {
    const mass = bodies.filter(b => b.resource === r).reduce((sum, b) => sum + b.mass, 0);
    return mass > 1e-9 ? [`${RESOURCE_INFO[r].label.toLowerCase()} ${fmt(mass)} kg`] : [];
  });
  return parts.length ? parts.join(' · ') : 'Mined out. Rocks do not come back.';
}

function siteLine(w: WorldState, id: SiteId): string {
  const site = w.exploration.sites.find(s => s.key === id);
  if (!site) return '';
  const hull = `Hull ${(site.health * 100).toFixed(0)}%`;
  if (id === 'cache') return `${hull} · salvage ${fmt(inventoryMass(site.stock))} kg`;
  if (id === 'tender') return `${hull} · fuel ${fmt(site.fuel)} kg`;
  return `${hull} · survey data for the ${BELTS[SITE_INFO[id].belt].label}`;
}

function siteAction(w: WorldState, id: SiteId): SelectedView['action'] {
  const site = w.exploration.sites.find(s => s.key === id);
  if (!site) return null;
  const label = id === 'cache' ? 'Recover salvage' : id === 'tender' ? 'Transfer tender fuel' : 'Survey Frost arc';
  const error = siteError(w, site);
  return { label, enabled: !error, reason: error ? plainReason(error) : 'In range. Press E, or use this button.' };
}

const REASONS: Record<string, string> = {
  'Pilot a flying ship to rendezvous': 'Fly out to it first.',
  'Approach within 120 m': 'Get within 120 m of it.',
  'Match relative speed to 8 m/s or less': 'Slow down to within 8 m/s of its speed.',
  'Planet blocks contact': 'The planet is in the way.',
};
function plainReason(error: string): string {
  if (error.startsWith('Site wrecked')) return 'It has broken up; anything left is drifting nearby.';
  return REASONS[error] ?? error;
}

/** One plain line on what to do next on the salvage route. */
function routeNote(w: WorldState): string {
  const e = w.exploration;
  if (e.returned) return 'Salvage delivered home.';
  if (e.sites.find(s => s.key === 'cache')?.health === 0 && e.salvaged === 0) return 'The derelict broke up. Pull in the drifting debris with C, or try the other sites.';
  if (e.salvaged > 0) return 'Salvage recovered: return to the green home pad and press E to unload.';
  return 'Survey the Frost buoy, recover ore from the Copper derelict, then bring it home.';
}

function selectedView(w: WorldState): SelectedView {
  const id = w.exploration.selected;
  const n = navigation(w);
  const facts: Array<[string, string]> = [
    ['Distance', `${Math.round(n.range)} m`],
    ['Closing speed', `${n.closing >= 0 ? '+' : '−'}${fmt(Math.abs(n.closing))} m/s`],
    ['Relative speed', `${fmt(n.relativeSpeed)} m/s`],
    ['Bearing', `${Math.round((n.bearing * 180) / Math.PI)}° ${w.playerMode === 'ship' ? 'from your nose' : 'from up'}`],
  ];
  const belt = BELT_IDS.find(b => b === id);
  const site = SITE_IDS.find(s => s === id);
  const surveyed = belt ? w.exploration.surveyed.includes(belt) : true;
  let body = '';
  if (id === 'home') body = 'Your outpost and landing pad.';
  else if (id === 'moon') {
    const survey = nacreSurvey(w);
    body = survey
      ? `Nacre, surveyed. Gravity ${survey.gravity}. Day ${survey.day}. Deposits: ${survey.deposits}. Airless; bring supplies.`
      : 'Nacre: airless, low gravity. Bring supplies; nothing is waiting there.';
  }
  else if (belt) body = surveyed ? beltStock(w, belt) : 'Unknown until surveyed. Survey the buoy in this arc to see what is here.';
  else if (site) body = siteLine(w, site);
  return {
    id,
    label: n.label,
    kind: kindOf(id),
    state: belt ? (surveyed ? 'Surveyed' : 'Not surveyed') : id === 'home' ? 'Explored' : site ? (w.exploration.sites.find(x => x.key === site)?.health ? 'Intact' : 'Wrecked') : 'Detected',
    facts,
    body,
    action: site ? siteAction(w, site) : null,
    blocked: n.occluded,
  };
}

/** How far from the planet's centre storm rocks are drawn at their true position; beyond that they sit on a ring. */
const STORM_CHART_RADIUS = 6000;

function stormMark(w: WorldState): StormMark | null {
  const known = stormKnowledge(w);
  if (!known) return null;
  const home = planetAt('home', w.system);
  const rocks = [...w.storm.far.map(b => farPosition(b, w.system.time)), ...w.defence.meteors.map(m => m.position)].map(position => {
    const dx = position.x - home.position.x;
    const dy = position.y - home.position.y;
    const distance = Math.hypot(dx, dy);
    const offChart = distance > STORM_CHART_RADIUS;
    const k = offChart ? STORM_CHART_RADIUS / distance : 1;
    return { at: { x: home.position.x + dx * k, y: home.position.y + dy * k }, offChart, distance };
  });
  const doubt = known.level === 'sighted' ? 700 : known.level === 'tracked' ? 300 : 120;
  const zone = { at: surfacePosition(home, WORLD.padAngle + known.corridor / WORLD.radius, 0), radius: known.corridorMargin };
  const side = known.corridor >= 0 ? 'right' : 'left';
  return { rocks, doubt, zone, line: `Landing about ${Math.round(Math.abs(known.corridor) / 10) * 10} m ${side} of the pad` };
}

export function mapView(w: WorldState): MapView {
  const moonVisible = featureVisible('moonTravel') || w.exploration.nacreSurveyed;
  const bodies = planets(w.system)
    .filter(b => b.id === 'home' || moonVisible)
    .map(b => ({ id: b.id, label: b.label, at: b.position, radius: b.radius, atmosphere: b.atmosphere }));
  const belts = BELT_IDS.map(id => ({
    id,
    label: BELTS[id].label,
    color: hex(BELTS[id].color),
    rocks: [...w.asteroids, ...w.pickups].filter(r => r.belt === id).map(r => ({ at: r.position, ore: r.mass > 0 })),
  }));
  const sites = w.exploration.sites.map(s => ({ id: s.key, label: SITE_INFO[s.key].label, at: s.position, intact: s.health > 0 }));
  const ids: Destination[] = ['home', ...(moonVisible && w.system.binary ? (['moon'] as const) : []), ...BELT_IDS, ...SITE_IDS];
  const places = ids.map(id => ({
    id,
    label: id === 'home' ? 'Home pad' : id === 'moon' ? 'Nacre moon' : (BELTS as Record<string, { label: string }>)[id]?.label ?? SITE_INFO[id as SiteId].label,
    at: destination(w, id).position,
    kind: kindOf(id),
    selected: w.exploration.selected === id,
  }));
  const storm = stormMark(w);
  const anchors: Vec[] = [
    w.ship.position,
    ...(storm ? storm.rocks.map(r => r.at) : []),
    ...wreckMarks(w).map(x => x.at),
    ...sites.map(s => s.at),
    ...belts.flatMap(b => b.rocks.map(r => r.at)),
    ...bodies.flatMap(b => [
      { x: b.at.x - b.radius - b.atmosphere, y: b.at.y - b.radius - b.atmosphere },
      { x: b.at.x + b.radius + b.atmosphere, y: b.at.y + b.radius + b.atmosphere },
    ]),
  ];
  return {
    bodies,
    belts,
    sites,
    ship: w.ship.position,
    pad: destination(w, 'home').position,
    places,
    selected: selectedView(w),
    bounds: {
      minX: Math.min(...anchors.map(p => p.x)),
      maxX: Math.max(...anchors.map(p => p.x)),
      minY: Math.min(...anchors.map(p => p.y)),
      maxY: Math.max(...anchors.map(p => p.y)),
    },
    note: routeNote(w),
    storm,
    wrecks: wreckMarks(w),
  };
}

