/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

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
  } catch (error) {
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
    
  } catch (error) {
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