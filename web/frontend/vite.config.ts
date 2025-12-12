import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/app/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:33235',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/login': {
        target: 'http://localhost:33235',
        changeOrigin: true,
      },
      '/xui': {
        target: 'http://localhost:33235',
        changeOrigin: true,
      },
      '/server': {
        target: 'http://localhost:33235',
        changeOrigin: true,
      },
      '/core': {
        target: 'http://localhost:33235',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
  },
})
