import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/image/',
      define: {
        'process.env.PROJECT_ID': JSON.stringify(env.PROJECT_ID)
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
            target: 'http://localhost:5173',
            changeOrigin: true,
            configure: (proxy, options) => {
              // Fallback for development when backend is not available
              proxy.on('error', (err, req, res) => {
                console.log('Proxy error: Backend server not available');
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                  error: 'Backend server not available' 
                }));
              });
            }
          }
        }
      }
    };
});
