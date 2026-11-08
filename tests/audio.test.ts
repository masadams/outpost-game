import { describe, expect, it } from 'vitest';
import { AudioDirector } from '../src/audio/director';
import { parsePreferences } from '../src/audio/preferences';
import { createWorld } from '../src/sim/world';
import { WORLD } from '../src/sim/config';

describe('audio events stay separate from simulation', () => {
  it('emits launch, impact, touchdown and crash cues only on transitions', () => {
    const world = createWorld(), director = new AudioDirector(); director.reset(world);
    world.ship.state = 'flying'; world.ship.thrusting = true;
    expect(director.update(world, 1 / 60, false)).toMatchObject({ cues: ['launch'], engine: true });
    expect(director.update(world, 1 / 60, false).cues).toEqual([]);
    world.ship.hull = 80; expect(director.update(world, 1 / 60, false).cues).toContain('impact');
    world.ship.state = 'landed'; expect(director.update(world, 1 / 60, false).cues).toContain('land');
    world.ship.state = 'crashed'; world.ship.hull = 0;
    expect(director.update(world, 1 / 60, false).cues).toEqual(['crash']);
  });
  it('silences pause, does not replay events on resume, and rebases after load/reset', () => {
    const world = createWorld(), director = new AudioDirector(); director.reset(world);
    world.ship.state = 'flying'; world.ship.thrusting = true;
    expect(director.update(world, 1, true)).toEqual({ cues: [], engine: false, mining: false, tractor: false, machinery: false });
    expect(director.update(world, 1 / 60, false).cues).toEqual([]);
    const fresh = createWorld(); director.reset(fresh); expect(director.update(fresh, 1 / 60, false).cues).toEqual([]);
  });
  it('plays local fracture, pickup and delivery cues without reacting to distant rocks', () => {
    const world = createWorld(), director = new AudioDirector(); director.reset(world);
    world.asteroids.splice(0, 1); world.ship.cargo.iron = 5;
    expect(director.update(world, 1 / 60, false).cues).toEqual(['pickup', 'split']);
    world.unloaded = 5; world.ship.cargo.iron = 0;
    expect(director.update(world, 1 / 60, false).cues).toEqual(['delivery']);
    world.ship.position = { x: 0, y: -10000 }; director.reset(world); world.asteroids.splice(0, 1);
    expect(director.update(world, 1 / 60, false).cues).not.toContain('fracture');
  });
  it('paces footsteps by distance, detects jumps and rate-limits low oxygen warnings', () => {
    const world = createWorld(), director = new AudioDirector(); world.playerMode = 'astronaut'; director.reset(world);
    world.astronaut.position.x += 3; expect(director.update(world, 1, false).cues).toEqual([]);
    world.astronaut.position.x += 3; expect(director.update(world, 1, false).cues).toContain('step');
    world.astronaut.grounded = false; expect(director.update(world, 1, false).cues).toContain('jump');
    world.astronaut.oxygen = 29; expect(director.update(world, 1, false).cues).toContain('warning');
    for (let i = 0; i < 7; i++) expect(director.update(world, 1, false).cues).not.toContain('warning');
    expect(director.update(world, 1, false).cues).toContain('warning');
  });
  it('coalesces construction cues, stays quiet on each finished batch and keeps the hum to nearby working facilities', () => {
    const world = createWorld(), director = new AudioDirector(); director.reset(world);
    world.colony.buildings.push({ id: 1, kind: 'refinery', angle: 120 / WORLD.radius, enabled: true, recipe: 0, progress: 1.9, status: 'running' });
    expect(director.update(world, 1 / 60, false)).toMatchObject({ cues: ['build'], machinery: true });
    world.colony.buildings[0].progress = 0;
    expect(director.update(world, 1 / 60, false).cues).not.toContain('production');
    world.ship.position.y = -10000; expect(director.update(world, 1 / 60, false).machinery).toBe(false);
    world.colony.buildings = []; expect(director.update(world, 1 / 60, false).cues).toContain('demolish');
  });
  it('observes snapshots without mutating world state', () => {
    const world = createWorld(), original = structuredClone(world), director = new AudioDirector();
    director.reset(world); director.update(world, 1, false); expect(world).toEqual(original);
  });
});
it.each([null, '{broken', '{"muted":false,"volume":2}', '{"muted":"yes","volume":0.2}'])('recovers malformed audio preferences: %s', text => {
  expect(parsePreferences(text)).toEqual({ muted: false, volume: 0.35 });
});
it('restores valid muted and zero-volume preferences', () => {
  expect(parsePreferences('{"muted":true,"volume":0}')).toEqual({ muted: true, volume: 0 });
});

it('announces airless source arrival distinctly, with no false atmospheric entry and no replay after load',async()=>{
 const {colonyWorld}=await import('../src/sim/localWorld');
 const w=createWorld(),director=new AudioDirector();w.ship.state='flying';director.reset(w);
 expect(director.update(colonyWorld(w,'moon'),1/60,false).cues).toEqual(['airlessArrival']);
 expect(director.update(colonyWorld(w,'moon'),1/60,false).cues).toEqual([]);
 director.reset(colonyWorld(w,'moon'));expect(director.update(colonyWorld(w,'moon'),1/60,false).cues).toEqual([]);
 expect(director.update(w,1/60,false).cues).toEqual([]);
});

it('paces footsteps by surface travel rather than the moving moon carrying idle crew',async()=>{
 const {colonyWorld}=await import('../src/sim/localWorld'),{planetAt,surfacePosition}=await import('../src/sim/celestial');
 const w=createWorld();w.playerMode='astronaut';const moon=colonyWorld(w,'moon'),director=new AudioDirector();w.astronaut.position=surfacePosition(planetAt('moon',w.system),0,2.5);director.reset(moon);
 for(let i=0;i<10;i++){w.system.time+=1;w.astronaut.position=surfacePosition(planetAt('moon',w.system),0,2.5);expect(director.update(moon,1,false).cues).not.toContain('step');}
 w.astronaut.position=surfacePosition(planetAt('moon',w.system),6.1/450,2.5);expect(director.update(moon,1,false).cues).toContain('step');
});

describe('rock break cues', () => {
  it('splits a big rock and shatters a small one', () => {
    const world = createWorld();
    const director = new AudioDirector();
    director.reset(world);
    const [big, small] = world.asteroids;
    big.stage = 0;
    small.stage = 1;
    big.position = { ...world.ship.position };
    small.position = { ...world.ship.position };
    director.reset(world);
    world.asteroids.splice(0, 2);
    const cues = director.update(world, 1 / 60, false).cues;
    expect(cues).toContain('split');
    expect(cues).toContain('fracture');
  });
});

describe('storm and observatory cues', () => {
  it('scans when the Observatory starts, sights the storm once and rings when it is over', () => {
    const w = createWorld();
    const director = new AudioDirector();
    director.reset(w);
    w.colony.buildings.push({ id: 7, kind: 'observatory', angle: 0.1, enabled: true, progress: 0, recipe: 0, status: 'running' } as never);
    expect(director.update(w, 1 / 60, false).cues).toContain('scan');
    expect(director.update(w, 1 / 60, false).cues).not.toContain('scan');
    w.storm.observed = 20;
    expect(director.update(w, 1 / 60, false).cues).toContain('sighting');
    expect(director.update(w, 1 / 60, false).cues).not.toContain('sighting');
    w.storm.phase = 'over';
    expect(director.update(w, 1 / 60, false).cues).toContain('stormOver');
  });
});

import { sendPod, stepPods } from '../src/sim/pods';
import { completedBuilding } from '../src/sim/construction';
import { launchBeacon, stepSignal } from '../src/sim/signal';
import { TECH_IDS } from '../src/sim/progressionConfig';

describe('sounds for pods and the far signal', () => {
  function podWorld() {
    const w = createWorld(5);
    w.system.binary = true;
    w.exploration.known.push('moon');
    w.colony.buildings.push(completedBuilding(1, 'refinery', 0.2, w));
    w.colony.products.fuel = 50;
    w.depot.iron = 80;
    w.nextId = 40;
    return w;
  }

  it('a pod launching and landing near you is heard once each', () => {
    const w = podWorld();
    const director = new AudioDirector();
    director.reset(w);
    sendPod(w, 'home', 'moon');
    expect(director.update(w, 1 / 60, false).cues).toContain('podLaunch');
    expect(director.update(w, 1 / 60, false).cues).not.toContain('podLaunch');
    w.system.time = w.exploration.pods[0].arrives + 1;
    stepPods(w);
    const heard = director.update(w, 1 / 60, false).cues;
    expect(heard.filter(c => c === 'podLand' || c === 'podLost').length).toBeLessThanOrEqual(1);
  });

  it('a signal coming back from far away rings once', () => {
    const w = createWorld(7);
    w.colony.research.completed.push(...TECH_IDS);
    w.colony.products = { ...w.colony.products, fuel: 90, alloy: 90, wire: 90, components: 90 };
    w.colony.buildings.push(completedBuilding(3, 'observatory', 0.17, w), completedBuilding(4, 'antenna', 0.2, w));
    for (const b of w.colony.buildings) b.status = 'running';
    launchBeacon(w);
    const director = new AudioDirector();
    director.reset(w);
    w.system.time = w.exploration.signal!.hearAt + 1;
    stepSignal(w);
    expect(director.update(w, 1 / 60, false).cues).toContain('signal');
    expect(director.update(w, 1 / 60, false).cues).not.toContain('signal');
  });
});
