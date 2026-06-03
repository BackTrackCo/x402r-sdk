import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    actions: 'src/actions/index.ts',
    plugins: 'src/plugins/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  fixedExtension: false,
  publint: { strict: true },
  attw: { level: 'error', profile: 'esm-only' },
})
