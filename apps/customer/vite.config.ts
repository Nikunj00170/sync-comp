import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  plugins: [react()],
  base: './',
  envDir: fileURLToPath(new URL('../../', import.meta.url)),
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    watch: { ignored: ['**/android/**'] },
  },
  build: { sourcemap: false, target: 'es2022' },
});
