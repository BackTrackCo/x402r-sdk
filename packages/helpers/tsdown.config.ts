import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: 'esm',
  fixedExtension: false,
  dts: true,
  sourcemap: true,
  clean: true,
  outputOptions: { comments: { jsdoc: false } },
})
