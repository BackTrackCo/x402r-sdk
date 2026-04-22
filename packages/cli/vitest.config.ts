import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'cli',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: [process.env.CI ? 'lcov' : 'text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/bin.ts'],
    },
  },
})
