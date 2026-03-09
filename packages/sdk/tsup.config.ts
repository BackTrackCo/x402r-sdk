import { defineConfig } from 'tsup'

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
})
