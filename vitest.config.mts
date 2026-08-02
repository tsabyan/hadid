import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    // Node environment only. Everything under test is pure computation — the
    // moment a test needs a DOM, it is testing a component, and that belongs
    // in a different config with a different cost.
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
})
