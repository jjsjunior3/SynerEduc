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
    target: ['es2020', 'chrome80', 'safari13'],
    outDir: 'build',
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          'vendor-react':    ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-charts':   ['recharts'],
          'vendor-pdf':      ['jspdf', 'jspdf-autotable'],
          'vendor-icons':    ['lucide-react'],
          'vendor-theme':    ['next-themes'],
          'vendor-notify':   ['sonner'],
          'vendor-utils':    ['clsx', 'tailwind-merge', 'class-variance-authority'],
        },
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
    headers: {
      'X-Frame-Options':           'DENY',
      'X-Content-Type-Options':    'nosniff',
      'Referrer-Policy':           'strict-origin-when-cross-origin',
      'Permissions-Policy':        'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy':   [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",   // unsafe-inline necessário para Vite HMR em dev
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://*.supabase.co",
        "connect-src 'self' https://*.supabase.co https://api.anthropic.com wss://*.supabase.co",
        "font-src 'self'",
        "frame-ancestors 'none'",
      ].join('; '),
    },
  },
  // Headers de segurança também aplicados no build (para preview/produção via Vite preview)
  preview: {
    headers: {
      'X-Frame-Options':        'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy':        'strict-origin-when-cross-origin',
      'Permissions-Policy':     'camera=(), microphone=(), geolocation=()',
    },
  },
});