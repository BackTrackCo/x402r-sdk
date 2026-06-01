import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    bin: 'src/bin.ts',
  },
  format: 'esm',
  fixedExtension: false,
  dts: true,
  sourcemap: true,
  clean: true,
  outputOptions: { comments: { jsdoc: false } },
})
