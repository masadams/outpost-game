import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({ ...base,
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 5173', url: 'http://127.0.0.1:5173', reuseExistingServer: false },
});
