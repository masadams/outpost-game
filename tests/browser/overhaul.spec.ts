import { expect } from '@playwright/test';
import { test } from './game';

test('persists accessible settings and conflict-checked controls without changing checkpoints or leaking focused input',async({page})=>{
 test.setTimeout(60000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:900,height:600});await page.goto('/');const hud=page.locator('#hud');await expect(hud).toHaveAttribute('data-state','landed');
 await page.getByRole('button',{name:'Open expedition objectives',exact:true}).click();await expect(page.locator('#operations-dock')).toHaveAttribute('data-panel','objectives');await expect(page.locator('#objective-panel')).toContainText('Make your first delivery');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Open settings',exact:true}).click();await expect(hud).toHaveAttribute('data-state','paused');
 await page.getByLabel('Text size',{exact:true}).selectOption('1.5');await page.getByLabel('Graphics quality',{exact:true}).selectOption('low');await page.getByLabel('Reduced motion and flashes').check();
 await page.getByRole('slider',{name:'Music volume',exact:true}).fill('0.4');await page.getByRole('slider',{name:'Effects volume',exact:true}).fill('0.5');
 await page.getByText('Keyboard bindings · click a key to change it',{exact:true}).click();
 await page.getByRole('button',{name:'Change Thrust / jump binding',exact:true}).click();await page.keyboard.press('p');await expect(page.locator('#binding-status')).toContainText('Already assigned');await page.keyboard.press('s');await expect(page.locator('#binding-status')).toHaveText('Control updated.');
 await page.getByRole('button',{name:'Return to game',exact:true}).click();await expect(hud).toHaveAttribute('data-state','landed');await expect(page.locator('.context-hint')).toContainText('S launch');await expect(hud).toHaveAttribute('data-star-count','80');await expect(hud).toHaveAttribute('data-effect-cap','0');
 await page.keyboard.down('w');await page.waitForTimeout(250);await page.keyboard.up('w');await expect(hud).toHaveAttribute('data-fuel','240.00');
 await page.getByRole('button',{name:'Ship [I]',exact:true}).focus();await page.keyboard.press('Space');await expect(page.locator('#operations-dock')).toHaveAttribute('data-panel','cargo');await page.keyboard.down('s');await page.waitForTimeout(250);await page.keyboard.up('s');await expect(hud).toHaveAttribute('data-fuel','240.00');
 await page.keyboard.press('Escape');await page.keyboard.down('s');await expect.poll(async()=>Number(await hud.getAttribute('data-fuel'))).toBeLessThan(240);await page.keyboard.up('s');await page.keyboard.press('p');
 expect(await page.evaluate(()=>localStorage.getItem('outpost.checkpoint.v1'))).toBeNull();
 await page.reload();await expect(page.locator('html')).toHaveAttribute('data-text-scale','1.5');await expect(hud).toHaveAttribute('data-state','landed');
 await page.getByRole('button',{name:'Open settings',exact:true}).click();await expect(page.getByRole('slider',{name:'Music volume',exact:true})).toHaveValue('0.4');await page.getByText('Keyboard bindings · click a key to change it',{exact:true}).click();await expect(page.getByRole('button',{name:'Change Thrust / jump binding',exact:true})).toHaveText('S');await page.getByRole('button',{name:'Change Pause binding',exact:true}).click();await page.keyboard.press('w');await page.getByRole('button',{name:'Return to game',exact:true}).click();await page.waitForTimeout(300);await expect(page.getByRole('button',{name:'Pause or resume game',exact:true})).toHaveText('Pause [W]');await page.keyboard.press('w');await expect(hud).toHaveAttribute('data-state','paused');await page.waitForTimeout(300);await expect(page.getByRole('button',{name:'Pause or resume game',exact:true})).toHaveText('Resume [W]');expect(errors).toEqual([]);
});

test('loads a paid expedition with native controls, respects pause and preserves exact freight after reload',async({page})=>{
 await page.goto('/');const hud=page.locator('#hud');await expect(hud).toHaveAttribute('data-state','landed');await page.keyboard.press('i');
 await page.locator('summary').filter({hasText:'Manufactured freight'}).click();const load=page.getByRole('button',{name:'Load Rig + solar expedition',exact:true});await expect(load).toBeEnabled();
 await load.click();await expect(hud).toHaveAttribute('data-cargo','25.00');await expect(load).toBeDisabled();await expect(page.locator('.manifest').first()).toContainText('Manifest already aboard');
 await page.keyboard.press('k');const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!));expect(save.world.ship.freight).toMatchObject({alloy:15,wire:5,components:5});expect(save.world.colony.products).toMatchObject({alloy:13,wire:9,components:3});expect(save.world.moon.colony.products.alloy).toBe(0);
 await page.keyboard.press('p');await expect(hud).toHaveAttribute('data-state','paused');await expect(page.getByRole('button',{name:'Load Small habitat + solar',exact:true})).toBeDisabled();await page.reload();await expect(hud).toHaveAttribute('data-cargo','25.00');await expect(hud).toHaveAttribute('data-state','paused');
});

test('keeps enlarged flight instruments and long live panels usable at supported desktop sizes',async({page})=>{
 test.setTimeout(90000);
 const {createWorld}=await import('../../src/sim/world'),{encodeCheckpoint}=await import('../../src/persistence/checkpoint');
 const w=createWorld();w.ship.state='flying';w.ship.position.y-=45;w.ship.velocity.x+=6;w.ship.velocity.y=12;w.ship.angle=.4;w.ship.angularVelocity=.5;w.ship.fuel=10;w.ship.hull=20;w.asteroids=[];
 await page.addInitScript(text=>localStorage.setItem('outpost.checkpoint.v1',text),encodeCheckpoint(w));
 for(const [width,height] of [[900,600],[1280,800],[1920,1080]]){
  await page.setViewportSize({width,height});await page.goto('/');await page.getByRole('button',{name:'Open settings',exact:true}).click();await page.getByLabel('Text size',{exact:true}).selectOption('1.5');await page.getByRole('button',{name:'Return to game',exact:true}).click();
  await page.getByRole('button',{name:'Manage',exact:true}).click();await expect(page.locator('#command-console')).toBeVisible();await page.getByRole('button',{name:'Compact operations window',exact:true}).click();
  const issues=await page.evaluate(()=>{
   const errors:string[]=[],sels=['.instruments','#operations-dock','.dock-nav','#flight-tools','#sound-panel','#objectives','.notices'];
   const boxes=sels.map(s=>({s,b:document.querySelector(s)!.getBoundingClientRect()}));
   const intersects=(a:DOMRect,b:DOMRect)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
   for(const {s,b}of boxes)if(b.left<0||b.top<0||b.right>innerWidth||b.bottom>innerHeight)errors.push(s+' outside');
   for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)if(intersects(boxes[i].b,boxes[j].b))errors.push(boxes[i].s+' overlaps '+boxes[j].s);
   document.querySelectorAll<HTMLElement>('.instruments label,.instrument-status').forEach(e=>{if(e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1)errors.push('clipped '+e.textContent);});return errors;
  });expect(issues).toEqual([]);await page.getByRole('button',{name:'Expand operations window',exact:true}).click();const dock=page.locator('#operations-dock'),box=await dock.boundingBox();expect(box!.width).toBeGreaterThan(width*.8);expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);expect(box!.y+box!.height).toBeLessThanOrEqual(height);expect(await dock.evaluate(e=>e.scrollWidth>e.clientWidth+1)).toBe(false);await page.screenshot({path:`docs/screenshots/overhaul-${width}.png`});await page.keyboard.press('Escape');
 }
});

test('bounds visual work with both colonies and full body budgets while distant mining keeps advancing',async({page})=>{
 test.setTimeout(45000);
 const {createWorld}=await import('../../src/sim/world'),{colonyWorld}=await import('../../src/sim/localWorld'),{completedBuilding}=await import('../../src/sim/construction'),{encodeCheckpoint}=await import('../../src/persistence/checkpoint');
 const w=createWorld(),base=w.asteroids[0];w.asteroids=Array.from({length:256},(_,i)=>({...base,id:i+1,position:{x:5000+i*30,y:-8000},velocity:{x:0,y:0}}));w.pickups=Array.from({length:256},(_,i)=>({id:257+i,position:{x:6000+i*30,y:-9000},velocity:{x:0,y:0},radius:1,mass:.5,resource:'iron' as const}));w.exploration.sites.forEach((s,i)=>s.id=513+i);w.nextId=516;
 const moon=colonyWorld(w,'moon');for(let i=0;i<48;i++)w.colony.buildings.push(completedBuilding(i+1,'solar',-Math.PI+i*Math.PI/24,w));w.colony.nextId=49;
 for(let i=0;i<24;i++)moon.colony.buildings.push(completedBuilding(1001+i,i===0?'miningRig':'solar',i===0?160/450:-Math.PI+i*Math.PI/12,moon));moon.colony.nextId=1025;
 const save=encodeCheckpoint(w);await page.addInitScript(text=>localStorage.setItem('outpost.checkpoint.v1',text),save);
 await page.goto('/');const hud=page.locator('#hud');await expect(hud).toHaveAttribute('data-state','paused');await page.getByRole('button',{name:'Manage',exact:true}).click();await page.waitForTimeout(700);
 const detailed=await hud.evaluate(e=>({drawMean:e.dataset.renderMs,drawP95:e.dataset.renderP95,hudMean:e.dataset.hudMs,nodes:document.querySelectorAll('*').length}));expect(detailed.nodes).toBeLessThan(3500);
 await page.getByRole('button',{name:'Open settings',exact:true}).click();await page.getByLabel('Graphics quality',{exact:true}).selectOption('low');await page.getByLabel('Reduced motion and flashes').check();await page.getByRole('button',{name:'Return to game',exact:true}).click();await expect(hud).toHaveAttribute('data-star-count','80');await expect(hud).toHaveAttribute('data-effect-cap','0');
 const samples=await hud.getAttribute('data-draw-samples');await page.waitForTimeout(300);expect(await hud.getAttribute('data-draw-samples')).toBe(samples);
 await page.keyboard.press('Escape');await page.keyboard.press('p');await page.waitForTimeout(1200);await page.keyboard.press('p');await page.keyboard.press('k');
 const result=await page.evaluate(()=>JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!));expect(result.world.system.time).toBeGreaterThan(.5);expect(result.world.moon.colony.buildings[0].progress+result.world.moon.depot.ice).toBeGreaterThan(0);expect(result.world.asteroids).toHaveLength(256);expect(result.world.pickups).toHaveLength(256);
 const live=await hud.evaluate(e=>({drawMean:e.dataset.renderMs,drawP95:e.dataset.renderP95,hudMean:e.dataset.hudMs,samples:e.dataset.drawSamples,nodes:document.querySelectorAll('*').length}));console.log('Presentation CPU submission sample (cloud Chromium):',JSON.stringify({paused:detailed,live}));
});

test('selects the clicked physical facility for Command inspection without spending or moving while paused',async({page})=>{
 const {createWorld}=await import('../../src/sim/world'),{completedBuilding}=await import('../../src/sim/construction'),{encodeCheckpoint}=await import('../../src/persistence/checkpoint'),{sitePosition}=await import('../../src/sim/localWorld');
 const w=createWorld();w.colony.buildings.push(completedBuilding(1,'solar',-100/1800,w),completedBuilding(2,'solar',100/1800,w));w.colony.nextId=3;const point=sitePosition(w,100/1800,8),save=encodeCheckpoint(w);
 await page.addInitScript(text=>localStorage.setItem('outpost.checkpoint.v1',text),save);await page.goto('/');await expect(page.locator('#hud')).toHaveAttribute('data-state','paused');
 await page.mouse.click(640+(point.x-w.ship.position.x)*1.7,800*.53+(point.y-w.ship.position.y)*1.7);
 await expect(page.locator('#operations-dock')).toHaveAttribute('data-panel','command');await expect(page.locator('.command-machine')).toHaveAttribute('data-selected','2');await expect(page.getByRole('button',{name:'Disable selected',exact:true})).toBeDisabled();await expect(page.locator('#hud')).toHaveAttribute('data-time','0.0000');
 await page.screenshot({path:'docs/screenshots/overhaul-facilities.png'});await page.getByRole('button',{name:'Open full colony management',exact:true}).click();await page.getByRole('button',{name:'Economy',exact:true}).click();await expect(page.locator('.command-machine')).toBeHidden();await page.getByRole('button',{name:'Facilities',exact:true}).click();await expect(page.locator('.command-machine')).toHaveAttribute('data-selected','2');await expect(page.locator('#hud')).toHaveAttribute('data-time','0.0000');
});
