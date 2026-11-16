import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// `npm run dev` serves the UI with hot reload and proxies the API to a host
// started with `npm run dev:host` (port 4777).
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: { $lib: fileURLToPath(new URL('./src/lib', import.meta.url)) },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:4777',
      '/ws': { target: 'ws://localhost:4777', ws: true },
    },
  },
})
