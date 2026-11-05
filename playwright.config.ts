import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:5173';

/** The regression suite exercises every system, including ones hidden from new players (docs/CURRENT_FOCUS.md).
 * focusMode.spec.ts opts back out to check what a new player sees. */
export const ALL_FEATURES = {
  cookies: [],
  origins: [{ origin: baseURL, localStorage: [{ name: 'outpost.features', value: 'all' }] }],
};

export default defineConfig({
  workers: 1,
  testDir: './tests/browser',
  use: { baseURL, viewport: { width: 1280, height: 800 }, storageState: ALL_FEATURES },
  webServer: { command: 'npm run dev -- --host 127.0.0.1', url: baseURL, reuseExistingServer: false },
});
