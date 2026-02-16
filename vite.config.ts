
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load environment variables from the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // If API_KEY is found during build (e.g. local .env), hardcode it. 
      // Otherwise, leave the expression as-is to allow runtime injection/shimming.
      'process.env.API_KEY': env.API_KEY ? JSON.stringify(env.API_KEY) : 'process.env.API_KEY',
      'process.env.NODE_ENV': JSON.stringify(mode || 'production'),
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
