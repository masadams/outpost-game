import { defineConfig } from 'vitest/config';

// The economy bot plays ten game days; it is slow, so it runs on its own (`npm run bot`).
export default defineConfig({ test: { include: ['tests/bot/*.test.ts'], testTimeout: 600000 } });
