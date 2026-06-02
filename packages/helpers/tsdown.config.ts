import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node22',
  fixedExtension: false,
  publint: { level: 'error' },
  attw: { level: 'error', profile: 'esm-only' },
})
