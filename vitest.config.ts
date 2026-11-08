import { defineConfig } from 'vitest/config';

// Several simulation tests run thousands of steps and take a few seconds; give them room on a busy machine.
export default defineConfig({ test: { include: ['tests/*.test.ts'], testTimeout: 30000 } });
