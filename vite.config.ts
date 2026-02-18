
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env vars regardless of the `VITE_` prefix.
  // Fix: Cast process to any to resolve 'cwd' property error in some TypeScript environments
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode || 'production'),
      // Map platform-specific keys to the internal process.env.API_KEY used by the SDK
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_GEMINI_API_KEY || env.VITE_API_KEY),
    },
    build: {
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return id.toString().split('node_modules/')[1].split('/')[0].toString();
            }
          },
        },
      },
    },
  };
});
