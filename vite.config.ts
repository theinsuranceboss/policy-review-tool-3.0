import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load environment variables from the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Explicitly injecting the key to ensure it's available as process.env.API_KEY in the browser
      'process.env.API_KEY': JSON.stringify("AIzaSyDEnP3NMl5cnO1NWiTWvcAmPMupVCwTqzE"),
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