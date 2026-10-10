import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function apiDevPlugin() {
  return {
    name: 'api-dev-server',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url && (req.url === '/api/notices' || req.url.startsWith('/api/notices?'))) {
          try {
            const handlerModule = await import('./api/notices.ts');
            return handlerModule.default(req, res);
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
            return;
          }
        }
        if (req.url && (req.url === '/api/log' || req.url.startsWith('/api/log?'))) {
          try {
            const handlerModule = await import('./api/log.ts');
            return handlerModule.default(req, res);
          } catch (e: any) {
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true }));
            return;
          }
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), apiDevPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: '/',
  esbuild: {
    // Strip console/debugger from production builds; keep them in dev.
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React runtime — always needed, cache forever
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          // Supabase client — large but needed early for auth
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase';
          }
          // Framer Motion — animation lib, only needed after first paint
          if (id.includes('node_modules/framer-motion/')) {
            return 'vendor-motion';
          }
          // Lucide icons — tree-shaken but still notable
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js'],
  },
}));
