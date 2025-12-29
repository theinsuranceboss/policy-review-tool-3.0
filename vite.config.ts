
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Standard size for modern apps with AI SDKs
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // This splits third-party libraries into their own files
        // ensuring the main application bundle stays small and fast
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return id.toString().split('node_modules/')[1].split('/')[0].toString();
          }
        },
      },
    },
  },
});
