import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.CLAUDE_API_KEY': JSON.stringify(env.CLAUDE_API_KEY),
        'process.env.PINTEREST_ACCESS_TOKEN': JSON.stringify(env.PINTEREST_ACCESS_TOKEN),
        'process.env.AMAZON_AFFILIATE_TAG': JSON.stringify(env.AMAZON_AFFILIATE_TAG),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
