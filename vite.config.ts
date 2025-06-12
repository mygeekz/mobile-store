
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Explicitly set frontend port
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // Your backend server address
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // Remove /api prefix when forwarding
      },
       // If you have /uploads proxied from backend, ensure it's handled correctly
      '/uploads': {
        target: 'http://localhost:3001', // Assuming uploads are served by backend
        changeOrigin: true,
        // No rewrite needed if backend serves /uploads directly
      }
    },
  },
  // build: { // Optional: ensure TypeScript is handled correctly in build if not already
  //   sourcemap: true, 
  // }
});
