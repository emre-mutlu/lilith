import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { middlewareMode: true },
  appType: 'spa',
  build: { outDir: 'dist/client' }
})
