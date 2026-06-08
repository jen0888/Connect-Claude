import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Dev + preview run on 5174; strictPort fails loudly instead of hopping to
  // another port, so the app is always at http://localhost:5174/.
  server: { port: 5174, strictPort: true },
  preview: { port: 5174, strictPort: true },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
