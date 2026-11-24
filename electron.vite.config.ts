import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: { rollupOptions: { input: { index: resolve('src/main/index.ts') } } }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { rollupOptions: { input: { index: resolve('src/preload/index.ts') }, output: { format: 'cjs', entryFileNames: '[name].js' } } }
  },
  renderer: {
    root: 'src/renderer',
    plugins: [preact()],
    build: {
      rollupOptions: {
        input: {
          dashboard: resolve('src/renderer/dashboard/index.html'),
          control: resolve('src/renderer/control/index.html')
        }
      }
    }
  }
})
