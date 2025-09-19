import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    host: 'localhost',
    // Restore normal HMR functionality now that Supabase connectivity is fixed
    hmr: {
      port: 3001,
      protocol: 'ws',
      host: 'localhost',
    },
    // Add file watching optimization to reduce HMR triggers
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**', '**/test-results/**', '**/playwright-report/**'],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  optimizeDeps: {
    exclude: ['@supabase/realtime-js'],
    include: [
      '@supabase/supabase-js',
      '@supabase/postgrest-js',
      '@supabase/auth-js'
    ],
  },
  define: {
    global: 'globalThis',
  },
})
