import { readFileSync } from 'node:fs'
import { defineConfig } from 'tsdown'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    types: 'src/types/index.ts',
    config: 'src/config/index.ts',
    errors: 'src/errors/index.ts',
    payment: 'src/payment/index.ts',
    actions: 'src/actions/index.ts',
    deploy: 'src/deploy/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
  target: 'node22',
  fixedExtension: false,
  publint: { level: 'error' },
  attw: { level: 'error', profile: 'esm-only' },
})
