import { scanPulse } from '../sim/prospect';
import { beaconPosition, podLane } from '../sim/pods';
import { SIGHTING_SECONDS } from '../sim/stormKnowledge';
import { nearestPlanet, relative, relativeVelocity } from '../sim/celestial';
import { entryHeat, flightRegion } from '../sim/flightRegion';
import { airDensity } from '../sim/environment';
import { colonyPlanet, sitePosition } from '../sim/localWorld';
import { cargoMass } from '../sim/shipMass';
import { HABITATS, isHabitat } from '../sim/habitatConfig';
import { habitatContains, habitatSource } from '../sim/habitats';
import { flightSafety } from '../sim/flightSafety';
import type { WorldState } from '../sim/world';

export type Cue = 'reentry' | 'memory' | 'survey' | 'deepFind' | 'keystone' | 'hqUpgrade' | 'seedStage' | 'tugReturn' | 'stormSiren' | 'stormAlarm' | 'airlessArrival' | 'launch' | 'land' | 'impact' | 'crash' | 'fracture' | 'split' | 'pickup' | 'delivery' | 'build' | 'demolish' | 'airlock' | 'jump' | 'step' | 'service' | 'refuel' | 'production' | 'warning' | 'shot' | 'landingWarning' | 'fuelWarning' | 'towLatch' | 'towRelease' | 'towSnap' | 'atmosphereExit' | 'atmosphereEntry' | 'shieldHit' | 'shieldBreach' | 'scan' | 'sighting' | 'stormOver' | 'podLaunch' | 'podLand' | 'podLost' | 'signal';
export interface SoundFrame { cues: Cue[]; engine: boolean; mining: boolean; tractor: boolean; machinery: boolean }
const silent = (): SoundFrame => ({ cues: [], engine: false, mining: false, tractor: false, machinery: false });
/** How hot the air is making the lander right now (0 to 1). */
function shipHeat(world: WorldState): number {
  if (world.playerMode !== 'ship' || world.ship.state !== 'flying') return 0;
  const planet = nearestPlanet(world.ship.position, world.system);
  const v = relativeVelocity(world.ship.velocity, planet, world.ship.position);
  return entryHeat(Math.hypot(v.x, v.y), flightRegion(world.ship.position, world.system));
}
/** Counts that only ever go up as the story and the base move on: a rise in any of them is a moment worth a sound. */
function storyMarks(world: WorldState) {
  const root = world.rootWorld ?? world;
  const seams = [root.surfaceDeposits, ...Object.values(root.outposts).map(o => o.surfaceDeposits)];
  const tugs = root.colony.buildings.filter(b => b.kind === 'tugBay');
  return {
    memoryCount: root.exploration.story?.memories.length ?? 0,
    surveyedSeams: seams.flat().filter(d => d.surveyed === true).length,
    prospects: scanPulse(root).count,
    deepCount: root.exploration.deep?.length ?? 0,
    keystoneCount: Object.keys(root.exploration.keystones ?? {}).length,
    hq: root.colony.buildings.find(b => b.kind === 'headquarters')?.hqLevel ?? 0,
    seedStages: root.exploration.seedShip?.stages.length ?? 0,
    tugLoads: tugs.reduce((sum, b) => sum + (b.progress ?? 0), 0),
    tugCount: tugs.length,
  };
}
function snapshot(world: WorldState) {
  return { body: world.siteBody ?? 'home', shieldHits: world.colony.shielding.hits, shieldBreaches: world.colony.shielding.breaches, research: world.colony.research.completed.length, equipment: world.ship.equipment.length, surveys: world.exploration.surveyed.length, salvage: world.exploration.salvaged, habitat: !!habitatSource(world), space: airDensity(world.ship.position, world.system) <= 0, towRig: world.ship.towRig, towTarget: world.towing.targetId, towBreaks: world.towing.breaks, combatKills: world.combat.kills, threats: world.defence.meteors.length + world.combat.enemies.length, shots: world.defence.shots + world.combat.shots + world.combat.enemyShots, impacts: world.defence.impacts,
    buildingHull: world.colony.buildings.reduce((sum, b) => sum + (b.health ?? 100), 0), mode: world.playerMode, state: world.ship.state, hull: world.ship.hull, fuel: world.ship.fuel,
    grounded: world.astronaut.grounded, suitHealth: world.astronaut.health, oxygen: world.astronaut.oxygen,
    position: relative(world.astronaut.position,colonyPlanet(world)), cargo: cargoMass(world.ship), unloaded: world.unloaded,
    crystal: world.exploration.crystal, core: world.exploration.core, held: world.storm.held,
    scanning: world.colony.buildings.some(b => b.kind === 'observatory' && b.status === 'running'), sighted: world.storm.observed >= SIGHTING_SECONDS, stormOver: world.storm.phase === 'over', stormNear: world.storm.armed && world.storm.phase === 'approaching', ...storyMarks(world), hot: shipHeat(world) > 0.4, falling: world.defence.meteors.length,
    podIds: world.exploration.pods.map(p => p.id), beacons: (world.exploration.beacons ?? []).map(b => `${b.id}:${b.kind}`),
    signal: world.exploration.signal?.phase ?? 'none', expedition: world.exploration.expedition ? `${world.exploration.expedition.count}:${world.exploration.expedition.phase}` : 'none',
    rocks: new Map(world.asteroids.map(b => [b.id, { ...b.position, stage: b.stage }])),
    buildings: new Map(world.colony.buildings.map(b => [b.id, { progress: b.progress, recipe: b.recipe }])) };
}
export class AudioDirector {
  private previous: ReturnType<typeof snapshot> | null = null;
  private footDistance = 0;
  private alarmTime = 0;
  private lastAlarm = new Map<string, number>();
  private regionCooldown = 0;
  reset(world: WorldState): void { this.previous = snapshot(world); this.footDistance = 0; this.alarmTime = 0; this.lastAlarm.clear(); this.regionCooldown = 0; }
  update(world: WorldState, seconds: number, paused: boolean): SoundFrame {
    const next = snapshot(world), prev = this.previous; this.previous = next;
    if (!prev || paused) { this.footDistance = 0; return silent(); }
    if(prev.body!==next.body){this.footDistance=0;const frame=silent();if(next.body==='moon'&&world.playerMode==='ship'&&world.ship.state==='flying')frame.cues=['airlessArrival'];return frame;}
    const onFoot = world.playerMode === 'astronaut', alive = onFoot ? next.suitHealth > 0 : next.state !== 'crashed';
    const viewer = onFoot ? world.astronaut.position : world.ship.position;
    const near = (x: number, y: number, range: number) => Math.hypot(viewer.x - x, viewer.y - y) <= range;
    const cues: Cue[] = [];
    this.regionCooldown = Math.max(0, this.regionCooldown - Math.max(0, seconds));
    if (!onFoot && prev.mode === 'ship' && next.state === 'flying' && prev.state === 'flying' && next.space !== prev.space && this.regionCooldown <= 1e-9) {
      cues.push(next.space ? 'atmosphereExit' : 'atmosphereEntry'); this.regionCooldown = 6;
    }
    if ((next.crystal === 'carried' && prev.crystal === 'lying') || (next.core === 'carried' && prev.core === 'lying') || next.held > prev.held) cues.push('pickup');
    if (next.scanning && !prev.scanning) cues.push('scan');
    if (next.sighted && !prev.sighted) cues.push('sighting');
    if (next.stormOver && !prev.stormOver) cues.push('stormOver');
    // Coming into the air hot: a roar as the glow builds.
    if (next.hot && !prev.hot) cues.push('reentry');
    // Story and base moments. A load of saves or catch-up never sounds: only a rise of one or two.
    const rose = (a: number, b: number) => b > a && b - a <= 2;
    if (rose(prev.deepCount, next.deepCount)) cues.push('deepFind');
    else if (rose(prev.keystoneCount, next.keystoneCount)) cues.push('keystone');
    else if (rose(prev.memoryCount, next.memoryCount)) cues.push('memory');
    const scanned = next.prospects > prev.prospects;
    if (scanned) cues.push('scan');
    if (rose(prev.surveyedSeams, next.surveyedSeams) || (scanned && next.surveyedSeams > prev.surveyedSeams)) {
      cues.push('survey');
    }
    if (rose(prev.hq, next.hq) && prev.hq > 0) cues.push('hqUpgrade');
    if (rose(prev.seedStages, next.seedStages)) cues.push('seedStage');
    // A tug finishing its trip: its work drops back to nothing.
    if (next.tugCount === prev.tugCount && next.tugLoads < prev.tugLoads - 30) cues.push('tugReturn');
    // The storm closing in sounds a slow siren; the first rock overhead sounds the alarm.
    if (next.stormNear && !prev.stormNear) cues.push('stormSiren');
    if (next.stormNear && next.falling > 0 && prev.falling === 0) cues.push('stormAlarm');
    // Cargo pods: heard when they leave or come down near you.
    for (const pod of world.exploration.pods) {
      if (!prev.podIds.includes(pod.id)) {
        const from = podLane(world, pod).from;
        if (near(from.x, from.y, 9000)) cues.push('podLaunch');
      }
    }
    for (const beacon of world.exploration.beacons ?? []) {
      if (prev.beacons.includes(`${beacon.id}:${beacon.kind}`)) continue;
      const at = beaconPosition(world, beacon);
      if (near(at.x, at.y, 9000)) cues.push(beacon.kind === 'landed' ? 'podLand' : 'podLost');
    }
    if ((prev.signal === 'sent' && next.signal === 'heard') || (prev.expedition.endsWith(':out') && next.expedition.endsWith(':back'))) cues.push('signal');
    if (next.shieldBreaches > prev.shieldBreaches) cues.push('shieldBreach');
    else if (next.shieldHits > prev.shieldHits) cues.push('shieldHit');
    if (next.research > prev.research) cues.push('production');
    if (next.equipment > prev.equipment) cues.push('build');
    if (next.equipment < prev.equipment) cues.push('demolish');
    if (next.towRig && !prev.towRig) cues.push('build');
    if (next.towTarget !== null && next.towTarget !== prev.towTarget) cues.push('towLatch');
    if (next.towBreaks > prev.towBreaks) cues.push('towSnap');
    else if (prev.towTarget !== null && next.towTarget === null) cues.push('towRelease');
    if ((next.state === 'crashed' && prev.state !== 'crashed') || (next.suitHealth === 0 && prev.suitHealth > 0)) cues.push('crash');
    else if (next.hull < prev.hull || next.suitHealth < prev.suitHealth - 1) cues.push('impact');
    if (next.shots > prev.shots) cues.push('shot');
    if (next.combatKills > prev.combatKills) cues.push('fracture');
    if (next.impacts > prev.impacts || (next.buildingHull < prev.buildingHull && next.buildings.size === prev.buildings.size)) cues.push('impact');
    if (prev.state === 'landed' && next.state === 'flying') cues.push('launch');
    if (prev.state === 'flying' && next.state === 'landed') cues.push('land');
    if (onFoot && prev.mode === 'astronaut' && prev.habitat !== next.habitat) cues.push('airlock');
    if (prev.mode !== next.mode) { cues.push('airlock'); this.footDistance = 0; }
    else if (onFoot && alive) {
      if (prev.grounded && !next.grounded) cues.push('jump');
      if (!prev.grounded && next.grounded) cues.push('step');
      if (prev.grounded && next.grounded) {
        this.footDistance += Math.hypot(next.position.x - prev.position.x, next.position.y - prev.position.y);
        if (this.footDistance >= 6) { cues.push('step'); this.footDistance %= 6; }
      } else this.footDistance = 0;
      if (next.oxygen > prev.oxygen + 1 || next.suitHealth > prev.suitHealth) cues.push('service');
    }
    if (next.surveys > prev.surveys) cues.push('service');
    if (next.cargo > prev.cargo + 1e-6) cues.push('pickup');
    if (next.unloaded > prev.unloaded) cues.push('delivery');
    if (next.fuel > prev.fuel + 1e-6) cues.push('refuel');
    // A big rock splitting in two sounds different from a small one shattering into ore.
    for (const [id, p] of prev.rocks) {
      if (next.rocks.has(id) || !near(p.x, p.y, 650)) continue;
      cues.push(p.stage === 0 ? 'split' : 'fracture');
    }
    const added = Array.from(next.buildings.keys()).some(id => !prev.buildings.has(id));
    const removed = Array.from(prev.buildings.keys()).some(id => !next.buildings.has(id));
    if (added) cues.push('build'); if (removed) cues.push('demolish');
    const machinery = world.colony.buildings.some(b => {
      return b.status === 'running' && near(sitePosition(world, b.angle).x, sitePosition(world, b.angle).y, 150);
    });
    // Machines finishing a batch make no sound of their own: the quiet hum while they run is enough.
    const safety = flightSafety(world.ship, world.system), fuelLevel = safety.instruments.fuel.level;
    const landing = alive && !onFoot && safety.urgent, fuel = alive && !onFoot && next.state === 'flying' && (fuelLevel === 'caution' || fuelLevel === 'critical');
    const generic = alive && (next.threats > 0 || (onFoot ? (!next.habitat && next.oxygen < 30) || world.colony.buildings.some(b => isHabitat(b.kind) && b.habitat?.powered && habitatContains(b, world.astronaut.position, colonyPlanet(world)) && (b.status === 'air low' || b.habitat.backup && b.habitat.energy / HABITATS[b.kind].power <= 3)) : next.state === 'flying' && next.hull < 25));
    const fuelFirst = fuel && (fuelLevel === 'critical' || !generic);
    const key = landing ? 'landing' : fuelFirst ? `fuel-${fuelLevel}` : generic ? 'generic' : '';
    this.alarmTime += Math.max(0, seconds);
    const interval = landing ? 2.5 : fuelFirst && fuelLevel === 'critical' ? 4 : 8, last = this.lastAlarm.get(key);
    if (key && (last === undefined || this.alarmTime - last + 1e-9 >= interval)) {
      cues.push(landing ? 'landingWarning' : fuelFirst ? 'fuelWarning' : 'warning'); this.lastAlarm.set(key, this.alarmTime);
    }
    return { cues, engine: alive && !onFoot && world.ship.thrusting,
      mining: alive && !!world.beam, tractor: alive && world.tractorActive, machinery: alive && machinery };
  }
}
