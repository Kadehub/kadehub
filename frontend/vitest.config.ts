import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Unit tests for pure frontend logic (keypad reducer, tips engine, formatting). Run: npm test
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
