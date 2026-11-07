import { describe, expect, it } from 'vitest';
import { createWorld, type WorldState } from '../src/sim/world';
import { podLane, podPosition, beaconPosition, stepPods, stepBeacons, sendPod, POD, BEACON_SECONDS } from '../src/sim/pods';
import { colonyWorld } from '../src/sim/localWorld';
import { completedBuilding } from '../src/sim/construction';
import { BODIES, planetAt } from '../src/sim/celestial';
import { encodeCheckpoint, decodeCheckpoint } from '../src/persistence/checkpoint';

function ready(seed = 0): WorldState {
  const w = createWorld(seed);
  w.system.binary = true;
  w.system.sun = true;
  w.exploration.known.push('moon');
  const home = w.colony;
  home.buildings.push(completedBuilding(1, 'refinery', 0.2, w));
  home.nextId = 10;
  home.products.fuel = 50;
  w.depot.iron = 100;
  w.nextId = 40;
  return w;
}

describe('a cargo pod in flight', () => {
  it('leaves the sending depot, crosses to where the far world will be and comes down on its depot', () => {
    const w = ready();
    sendPod(w, 'home', 'moon');
    const pod = w.exploration.pods[0];
    expect(pod).toBeTruthy();
    const lane = podLane(w, pod);
    const home = planetAt('home', { ...w.system, time: pod.launched });
    const moon = planetAt('moon', { ...w.system, time: pod.arrives });
    expect(Math.hypot(lane.from.x - home.position.x, lane.from.y - home.position.y)).toBeCloseTo(BODIES.home.radius + 1, 3);
    expect(Math.hypot(lane.to.x - moon.position.x, lane.to.y - moon.position.y)).toBeCloseTo(BODIES.moon.radius + 1, 3);
  });

  it('climbs straight up from the depot first, then crosses, then comes straight down', () => {
    const w = ready();
    sendPod(w, 'home', 'moon');
    const pod = w.exploration.pods[0];
    const lane = podLane(w, pod);
    expect(podPosition(w, pod, pod.launched)).toEqual(lane.from);
    const end = podPosition(w, pod, pod.arrives);
    expect(end.x).toBeCloseTo(lane.to.x, 6);
    expect(end.y).toBeCloseTo(lane.to.y, 6);
    const home = planetAt('home', { ...w.system, time: pod.launched });
    const height = (p: { x: number; y: number }) => Math.hypot(p.x - home.position.x, p.y - home.position.y) - BODIES.home.radius;
    const at = (age: number) => podPosition(w, pod, pod.launched + age);
    expect(height(at(3))).toBeGreaterThan(height(at(1)));
    expect(height(at(12))).toBeGreaterThan(600);
    const far = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
    expect(far(at(1), lane.from)).toBeLessThan(far(at(6), lane.from));
  });

  it('takes as long as the lane needs at the pod speed, even though the far world moves', () => {
    const w = ready();
    sendPod(w, 'home', 'moon');
    const pod = w.exploration.pods[0];
    const lane = podLane(w, pod);
    const length = Math.hypot(lane.to.x - lane.from.x, lane.to.y - lane.from.y);
    const seconds = pod.arrives - pod.launched;
    expect(length / seconds).toBeGreaterThan(POD.speed * 0.8);
    expect(length / seconds).toBeLessThan(POD.speed * 1.2);
  });

  it('lands, puts the ore in the depot, and leaves a beacon at the landing site for a while', () => {
    const w = ready();
    sendPod(w, 'home', 'moon');
    const pod = w.exploration.pods[0];
    w.system.time = pod.arrives + 1;
    stepPods(w);
    expect(w.exploration.pods).toHaveLength(0);
    const beacon = w.exploration.beacons![0];
    expect(beacon).toMatchObject({ body: 'moon', from: 'home', kind: 'landed' });
    expect(beacon.kg).toBeGreaterThanOrEqual(40);
    expect(colonyWorld(w, 'moon').depot.iron).toBeGreaterThanOrEqual(40);
    const at = beaconPosition(w, beacon);
    const moon = planetAt('moon', w.system);
    expect(Math.hypot(at.x - moon.position.x, at.y - moon.position.y)).toBeCloseTo(BODIES.moon.radius + 2, 3);
    w.system.time = pod.arrives + BEACON_SECONDS.landed + 5;
    stepBeacons(w);
    expect(w.exploration.beacons).toHaveLength(0);
  });

  it('a lost pod leaves a different beacon and delivers nothing', () => {
    const w = ready(5);
    sendPod(w, 'home', 'moon');
    w.exploration.pods[0].doomed = true;
    w.system.time = w.exploration.pods[0].arrives + 1;
    stepPods(w);
    expect(w.exploration.beacons![0]).toMatchObject({ kind: 'lost' });
    expect(colonyWorld(w, 'moon').depot.iron).toBe(0);
    expect(w.notice.message).toMatch(/crashed short of Nacre/);
  });

  it('saves and loads with a pod in flight and a beacon on the ground', () => {
    const w = ready();
    sendPod(w, 'home', 'moon');
    const pod = w.exploration.pods[0];
    w.system.time = pod.arrives + 1;
    stepPods(w);
    sendPod(w, 'home', 'moon');
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(loaded.exploration.beacons).toHaveLength(1);
    expect(loaded.exploration.pods).toHaveLength(w.exploration.pods.length);
    void POD;
  });
});
