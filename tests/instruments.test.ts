import {expect,it} from 'vitest';
import {createWorld} from '../src/sim/world';
import {instrumentReadings,gaugeFraction} from '../src/ui/instruments';
import {flightSafety} from '../src/sim/flightSafety';
import {planetAt,surfacePosition} from '../src/sim/celestial';
import {SUIT} from '../src/sim/astronaut';
it('keeps six primary ship readings, signed velocities and exact values when the gauge auto-ranges',()=>{
 const w=createWorld();w.ship.state='flying';w.ship.position.y-=1500;w.ship.velocity={x:-28,y:40};const before=structuredClone(w),rows=instrumentReadings(w);
 expect(rows.filter(r=>r.primary).map(r=>r.key)).toEqual(['altitude','radial','drift','tilt','fuel','hull']);
 const altitude=rows.find(r=>r.key==='altitude')!,radial=rows.find(r=>r.key==='radial')!,drift=rows.find(r=>r.key==='drift')!;
 expect(altitude.value).toBeCloseTo(1500);expect(altitude.max).toBe(5000);expect(radial.value).toBeLessThan(0);expect(drift.value).toBeLessThan(0);expect(gaugeFraction(radial)).toBeGreaterThanOrEqual(0);expect(gaugeFraction(radial)).toBeLessThan(.5);expect(w).toEqual(before);
});
it('uses the actual fitted fuel capacity and keeps all landing-warning states including secondary spin',()=>{
 const w=createWorld();w.ship.equipment=['surveyTank'];w.ship.fuel=20;w.ship.state='flying';w.ship.position.y-=60;w.ship.velocity.y=20;w.ship.angularVelocity=.5;w.ship.angle=.4;
 const rows=instrumentReadings(w),safety=flightSafety(w.ship,w.system);
 expect(rows.find(r=>r.key==='fuel')).toMatchObject({value:5,state:{level:'critical'}});expect(rows.find(r=>r.key==='spin')).toMatchObject({primary:false,state:{level:'critical',label:'SPIN HIGH'}});
 for(const row of rows)expect(row.state).toEqual(safety.instruments[row.key as keyof typeof safety.instruments]);
});
it('uses four crew instruments in the moving moon frame and keeps depleted suit air critical',()=>{
 const w=createWorld(),moon=planetAt('moon',w.system);w.playerMode='astronaut';w.astronaut.position=surfacePosition(moon,0,SUIT.radius);w.astronaut.velocity={x:moon.velocity.x+3,y:moon.velocity.y-2};w.astronaut.oxygen=20;
 const rows=instrumentReadings(w);expect(rows.filter(r=>r.primary).map(r=>r.key)).toEqual(['altitude','speed','oxygen','suit']);expect(rows.find(r=>r.key==='altitude')!.value).toBeCloseTo(0);expect(rows.find(r=>r.key==='speed')!.value).toBeCloseTo(Math.sqrt(13));expect(rows.find(r=>r.key==='oxygen')).toMatchObject({state:{level:'critical',label:'LOW SUIT AIR'}});
});
it('renders signed attitude against local up while retaining the absolute landing tilt',()=>{
 const w=createWorld(),p=planetAt('home',w.system);w.ship.position=surfacePosition(p,.7,60);w.ship.state='flying';w.ship.angle=.7-.2;
 expect(instrumentReadings(w).find(r=>r.key==='tilt')).toMatchObject({attitude:expect.closeTo(-.2*180/Math.PI),value:expect.closeTo(.2*180/Math.PI)});
});
