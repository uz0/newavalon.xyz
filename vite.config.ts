import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ⚠️ В base укажи ИМЯ РЕПОЗИТОРИЯ на GitHub:
const repoName = 'NewAvalonSkirmish' 

export default defineConfig({
  plugins: [react()],
  base: `/${repoName}/`,      // важно для GitHub Pages
  build: {
    outDir: 'docs',           // билд в docs/
  },
})
