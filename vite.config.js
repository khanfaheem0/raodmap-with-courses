import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api/coursera': {
                target: 'https://api.coursera.org',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/coursera/, '/api'),
                secure: true,
            },
            '/api/tavily': {
                target: 'https://api.tavily.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/tavily/, ''),
                secure: true,
                configure: (proxy) => {
                    proxy.on('proxyReq', (proxyReq, req) => {
                        console.log(`[Tavily Proxy] → ${req.method} ${proxyReq.path}`);
                        console.log(`[Tavily Proxy] Authorization header present: ${!!proxyReq.getHeader('authorization')}`);
                        console.log(`[Tavily Proxy] Content-Type: ${proxyReq.getHeader('content-type')}`);
                    });
                    proxy.on('proxyRes', (proxyRes) => {
                        console.log(`[Tavily Proxy] ← Response status: ${proxyRes.statusCode}`);
                    });
                }
            }
        }
    }
})

