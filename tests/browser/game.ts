import { test as base, expect, type Page } from '@playwright/test';
/** Existing gameplay routes enter through the same public title buttons as players.
 * Menu-specific cases import Playwright directly and inspect the title themselves. */
async function enterGame(page:Page):Promise<void>{
 const menu=page.getByRole('dialog',{name:'Outpost game menu',exact:true});await expect(menu).toBeVisible();
 const saved=menu.getByRole('button',{name:'Continue',exact:true});const button=await saved.isEnabled()?saved:menu.getByRole('button',{name:'New Game',exact:true});
 await button.focus();await page.keyboard.press('Enter');await expect(menu).toBeHidden();
}
export const test=base.extend({page:async({page},use)=>{
 let clockInstalled=false;const install=page.clock.install.bind(page.clock);page.clock.install=async(...args)=>{clockInstalled=true;return install(...args);};
 const goto=page.goto.bind(page),reload=page.reload.bind(page);
 page.goto=async(...args)=>{const response=await goto(...args);if(clockInstalled)await page.clock.fastForward(100);await enterGame(page);return response;};
 page.reload=async options=>{const response=await reload(options);if(clockInstalled)await page.clock.fastForward(100);await enterGame(page);return response;};
 await page.addInitScript(()=>{try{localStorage.setItem('outpost.sun','off');}catch{/* blocked */}});
 await use(page);
}});

/** Starts a fresh game through the menu, as a player would (there is no restart key). */
export async function restart(page: Page): Promise<void> {
  const menu = page.getByRole('dialog', { name: 'Outpost game menu', exact: true });
  // Escape closes any open panel first, then opens the pause menu.
  for (let i = 0; i < 4 && !(await menu.isVisible()); i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
  }
  await expect(menu).toBeVisible();
  const title = menu.getByRole('button', { name: 'Return to title', exact: true });
  if (await title.isVisible()) await title.click();
  await menu.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(menu).toBeHidden();
}
