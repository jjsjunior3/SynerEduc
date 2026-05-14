import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'build',
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-hook-form',
      '@supabase/supabase-js',
      'recharts',
      'jspdf',
      'jspdf-autotable',
      'lucide-react',
      'motion',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
      'sonner',
      'next-themes',
      'embla-carousel-react',
      'react-day-picker',
      'react-resizable-panels',
      'recharts',
    ],
  },
  server: {
    port: 3000,
    open: true,
    warmup: {
      clientFiles: ['./src/main.tsx', './src/App.tsx'],
    },
  },
});