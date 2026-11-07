import { expect, type Page } from '@playwright/test';
import { test } from './game';
import { planetAt,surfacePosition } from '../../src/sim/celestial';
import { surfacePoint } from './screen';
const advance=async(p:Page,ms:number)=>{for(let t=0;t<ms;t+=100)await p.clock.fastForward(Math.min(100,ms-t));};
const tap=async(p:Page,key:string)=>{await p.keyboard.press(key);await advance(p,100);};
async function clock(p:Page){await p.clock.install({time:new Date('2030-01-01T00:00:00Z')});await p.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));}
const point=surfacePoint;
test('plans with the mouse, queues real costs from the ship, dispatches physical crew and preserves a paused work order',async({page})=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await clock(page);await page.goto('/');await advance(page,500);
 await expect(page.locator('#hud-chrome .screens button span')).toHaveText(['Ship','Build','Base','Map','Menu']);await page.getByRole('button',{name:'Build',exact:true}).click({force:true});await advance(page,100);
 await expect(page.locator('.build-card[data-select="solar"]')).toHaveAttribute('aria-pressed','true');const target=await point(page,'home',140/1800);await page.mouse.move(target.x,target.y);await advance(page,100);await expect(page.locator('#build-pointer-tip')).toContainText('Solar array');await page.mouse.click(target.x,target.y);await advance(page,100);
 await tap(page,'k');let save=await page.evaluate(()=>JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!));expect(save.world.colony.command.queue).toHaveLength(1);expect(save.world.colony.products).toMatchObject({alloy:24,wire:12,components:7});expect(save.world.colony.buildings).toHaveLength(0);
 await page.mouse.click(target.x,target.y,{button:'right'});await advance(page,100);await expect(page.locator('#hud')).toHaveAttribute('data-build-open','false');// Stepping out with work queued sends the astronaut automatically.
 await tap(page,'f');await advance(page,100);await expect(page.locator('#hud')).toHaveAttribute('data-crew-order','build');await advance(page,1000);await tap(page,'p');await tap(page,'k');save=await page.evaluate(()=>JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!));expect(save.version).toBe(32);expect(save.world.crewOrder).toEqual({type:'build',body:'home'});expect(save.world.astronaut.oxygen).toBeLessThan(180);
 await page.reload();await advance(page,500);await expect(page.locator('#hud')).toHaveAttribute('data-state','paused');await expect(page.locator('#hud')).toHaveAttribute('data-crew-order','build');const time=await page.locator('#hud').getAttribute('data-time');await advance(page,1000);await expect(page.locator('#hud')).toHaveAttribute('data-time',time!);
 await tap(page,'p');await advance(page,16000);await expect(page.locator('#hud')).toHaveAttribute('data-buildings','1');await expect(page.locator('#hud')).toHaveAttribute('data-crew-order','none');await tap(page,'k');const built=await page.evaluate(()=>JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!));expect(built.world.colony.command.queue).toHaveLength(0);expect(built.world.colony.products.alloy).toBe(24);expect(built.world.astronaut.oxygen).toBeLessThan(save.world.astronaut.oxygen);expect(errors).toEqual([]);await tap(page,'Escape');const inspected=await point(page,'home',built.world.colony.buildings[0].angle);await page.mouse.click(inspected.x,inspected.y,{button:'right'});await advance(page,100);await expect(page.getByRole('menu')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('menu')).toBeHidden();await page.mouse.click(inspected.x,inspected.y);await advance(page,100);await expect(page.locator('#operations-dock')).toHaveAttribute('data-panel','command');await expect(page.locator('.command-machine')).toBeInViewport();await page.screenshot({path:'docs/screenshots/direct-build.png'});
});
test('supports right-click walking and manual override without automatic flight',async({page})=>{
 await clock(page);await page.goto('/');await advance(page,500);await tap(page,'f');const target=await point(page,'home',150/1800);await page.mouse.click(target.x,target.y,{button:'right'});await advance(page,1000);await expect(page.locator('#hud')).toHaveAttribute('data-crew-order','walk');const before=Number(await page.locator('#hud').getAttribute('data-surface-angle'));await page.keyboard.down('a');await advance(page,1000);await page.keyboard.up('a');await expect(page.locator('#hud')).toHaveAttribute('data-crew-order','none');expect(Number(await page.locator('#hud').getAttribute('data-surface-angle'))).toBeLessThan(before);await tap(page,'k');const w=await page.evaluate(()=>JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!).world);expect(w.ship.fuel).toBe(240);expect(w.astronaut.oxygen).toBeLessThan(180);
});
test('places on a rotated moving moon and keeps paused planning free of paid actions',async({page})=>{
 test.setTimeout(60000);const {createWorld}=await import('../../src/sim/world'),{encodeCheckpoint}=await import('../../src/persistence/checkpoint');
 const w=createWorld();w.system.time=200;w.playerMode='astronaut';w.asteroids=[];const moon=planetAt('moon',w.system);w.astronaut.position=surfacePosition(moon,.8,2.5);w.astronaut.velocity={...moon.velocity};w.ship.position=surfacePosition(moon,.8,7);w.ship.velocity={...moon.velocity};w.ship.ground='moon';for(const key of Object.keys(w.colony.products)as(keyof typeof w.colony.products)[]){w.outposts.moon.colony.products[key]=w.colony.products[key];w.colony.products[key]=0;}
 await page.addInitScript(text=>{if(!sessionStorage.getItem('direct-fixture')){localStorage.setItem('outpost.checkpoint.v1',text);sessionStorage.setItem('direct-fixture','1');}},encodeCheckpoint(w));await clock(page);await page.goto('/');await advance(page,1000);await page.getByRole('button',{name:'Build',exact:true}).click({force:true});await advance(page,100);const target=await point(page,'moon',1);
 await page.mouse.move(target.x,target.y);await advance(page,100);await page.mouse.click(target.x,target.y);await advance(page,100);await tap(page,'k');let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!));expect(saved.world.system.time).toBe(200);expect(saved.world.outposts.moon.colony.command.queue).toHaveLength(0);expect(saved.world.outposts.moon.colony.products.alloy).toBe(28);
 await tap(page,'p');await page.mouse.click(target.x,target.y);await advance(page,100);await tap(page,'p');await tap(page,'k');saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!));expect(saved.world.outposts.moon.colony.command.queue).toHaveLength(1);expect(saved.world.outposts.moon.colony.command.queue[0].angle).toBeCloseTo(1,1);expect(saved.world.outposts.moon.colony.products.alloy).toBe(24);expect(saved.world.colony.products.alloy).toBe(0);expect(saved.world.colony.command.queue).toHaveLength(0);await page.mouse.click(target.x,target.y,{button:'right'});await advance(page,100);await expect(page.locator('#hud')).toHaveAttribute('data-build-open','false');
});
test('build bar names what is missing, queues from the landed lander and refunds a cancelled order',async({page})=>{
 await page.goto('/');const hud=page.locator('#hud'),bar=page.getByRole('region',{name:'Build',exact:true});
 await expect(hud).toHaveAttribute('data-state','landed');await page.getByRole('button',{name:'Build',exact:true}).click();
 await expect(bar).toBeVisible();await expect(page.locator('#instrument-console')).toBeHidden();
 await expect(bar).toContainText('Step out (F)');await expect(bar.locator('[data-resource="alloy"] strong')).toHaveText('28');
 const target=await point(page,'home',160/1800);await page.mouse.move(target.x,target.y);
 await expect(page.locator('#build-pointer-tip')).toHaveText('Solar array · click to place');
 await page.mouse.click(target.x,target.y);
 await expect(bar.locator('.build-order')).toHaveCount(1);await expect(bar.locator('[data-resource="alloy"] strong')).toHaveText('24');
 await page.mouse.move(target.x,target.y+1);await expect(page.locator('#build-pointer-tip')).toHaveText('Facilities overlap');
 await expect(page.locator('#build-pointer-tip')).toHaveAttribute('data-ok','false');
 await bar.getByRole('button',{name:'Cancel Solar array',exact:true}).click();
 await expect(bar.locator('.build-order')).toHaveCount(0);await expect(bar.locator('[data-resource="alloy"] strong')).toHaveText('28');
 await page.keyboard.press('k');const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!));
 expect(saved.world.colony.command.queue).toHaveLength(0);expect(saved.world.colony.products.alloy).toBe(28);expect(saved.world.ship.fuel).toBe(240);
 await bar.getByRole('button',{name:'Stop building',exact:true}).click();await expect(bar).toBeHidden();await expect(hud).toHaveAttribute('data-build-open','false');
});
