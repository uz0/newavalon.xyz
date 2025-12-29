import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import path from 'path'

export default defineConfig(({ command }: { command: string }) => {
  const baseConfig = {
    plugins: [react()],
    root: 'client', // Set root to client directory
    server: {
      host: true,
      port: 8080, // Vite dev server port (for standalone use)
    },
    css: {
      devSourcemap: true,
      postcss: {
        plugins: [
          tailwindcss(),
          autoprefixer(),
        ],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './client'),
        '@server': path.resolve(__dirname, './server'),
      }
    }
  }

  if (command === 'build') {
    // Эта часть сработает при запуске 'npm run build'
    return {
      ...baseConfig,
      base: `/`, // Базовый путь
      build: {
        outDir: '../dist',      // Output directory relative to client root (client -> ../dist = project/dist)
        cssMinify: true,
        emptyOutDir: true,
      },
    }
  } else {
    // Эта часть сработает при запуске 'npm run dev' (локальная разработка)
    return {
      ...baseConfig,
      base: '/', // Локально работаем просто от корня localhost
    }
  }
})