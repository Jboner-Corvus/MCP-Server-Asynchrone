
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    teardownTimeout: 10000,
    forceExit: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
