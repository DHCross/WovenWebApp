import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 5000,
    include: ['app/**/*.test.ts', 'app/**/*.test.tsx', 'test/**/*.test.ts', 'poetic-brain/test/**/*.test.ts', '__tests__/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
