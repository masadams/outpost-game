import { defineConfig } from '@playwright/test';
export default defineConfig({
  workers: 1,
  testDir: './tests/browser', use: { baseURL: 'http://127.0.0.1:5173', viewport: { width: 1280, height: 800 } },
  webServer: { command: 'npm run dev -- --host 127.0.0.1', url: 'http://127.0.0.1:5173', reuseExistingServer: false },
});
