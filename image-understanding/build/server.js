import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import { GoogleAuth } from 'google-auth-library';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 8080;
app.use(express.json());
app.use(compression());
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});
app.use('/image', express.static(path.join(__dirname, 'dist'), {
    maxAge: '1y',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));
app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.get('/readyz', async (req, res) => {
    try {
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
        await auth.getAccessToken();
        res.status(200).json({ status: 'ready' });
    }
    catch (error) {
        console.error('Readiness check failed:', error);
        res.status(503).json({
            status: 'not ready',
            error: 'authentication check failed'
        });
    }
});
app.post('/api/auth/token', async (req, res) => {
    try {
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
        const client = await auth.getClient();
        const accessTokenResponse = await client.getAccessToken();
        res.status(200).json({
            accessToken: accessTokenResponse.token,
        });
    }
    catch (error) {
        console.error('Error getting access token:', error);
        res.status(500).json({
            error: 'Failed to get access token'
        });
    }
});
app.get('/image/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
app.get('/', (req, res) => {
    res.redirect('/image/');
});
app.listen(port, () => {
    console.log(`Image understanding server running on port ${port}`);
});
