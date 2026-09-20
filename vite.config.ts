import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  // ВАЖНО ДЛЯ GITHUB PAGES: 
  // Указываем имя репозитория как базовый путь.
  // Формат: '/<repo-name>/'
  base: '/pomoshn-k-uchitelya-vk/', 
  
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
