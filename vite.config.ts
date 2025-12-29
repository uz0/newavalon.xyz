import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'client',
  server: {
    host: true,
    port: 8080,
  },
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  build: {
    outDir: '../dist',
    cssMinify: true,
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve('./client'),
      '@server': path.resolve('./server'),
    },
  },
})