import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/image/',
      define: {
        'process.env.GOOGLE_APPLICATION_CREDENTIALS': JSON.stringify(env.GOOGLE_APPLICATION_CREDENTIALS),
        'process.env.PROJECT_ID': JSON.stringify(env.PROJECT_ID),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      },
      build: {
        target: 'esnext'
      },
      server: {
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            configure: (proxy, options) => {
              // Fallback for development when backend is not available
              proxy.on('error', (err, req, res) => {
                console.log('Proxy error, using fallback');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                  accessToken: env.GEMINI_API_KEY || '' 
                }));
              });
            }
          }
        }
      }
    };
});
