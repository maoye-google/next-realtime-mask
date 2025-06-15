/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import { FunctionDeclaration, GoogleGenAI } from '@google/genai';
import multer from 'multer';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

const systemInstruction = `When given a video and a query, call the relevant \
function only once with the appropriate timecodes and text for the video`;

// Initialize GoogleGenAI with API key
const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// Helper function to wait for video file processing
async function waitForFileProcessing(fileName: string) {
  let getFile = await client.files.get({ name: fileName });

  const maxRetries = 24; // 24 retries * 5 seconds = 2 minute timeout
  let attempt = 0;
  while (getFile.state === 'PROCESSING' && attempt < maxRetries) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    getFile = await client.files.get({ name: fileName });
    console.log(`Current file status: ${getFile.state}`);
    attempt++;
  }

  if (getFile.state === 'PROCESSING') {
    await client.files.delete({ name: fileName });
    throw new Error('Video processing timed out');
  }

  if (getFile.state === 'FAILED') {
    throw new Error('Video processing failed');
  }

  return getFile;
}

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB limit
});

app.use(express.json({ limit: '10mb' }));
app.use(compression()); // Enable gzip compression

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Serve static files with optimized caching
app.use('/video', express.static(path.join(__dirname, 'dist'), {
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
    // Check if GEMINI_API_KEY is available
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    console.error('Readiness check failed:', error);
    res.status(503).json({ 
      status: 'not ready', 
      error: 'API key not configured' 
    });
  }
});

app.post('/api/video/generate', upload.single('video'), async (req, res) => {
  try {
    const { text, functionDeclarations, model = 'gemini-2.0-flash-exp' } = req.body;
    const videoFile = req.file;

    if (!videoFile) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    if (!text || !functionDeclarations) {
      return res.status(400).json({ error: 'Missing required fields: text and functionDeclarations' });
    }

    let tools;
    try {
      tools = [{ functionDeclarations: JSON.parse(functionDeclarations) }];
    } catch (e) {
      return res.status(400).json({ error: 'Invalid functionDeclarations format. Must be a valid JSON string.' });
    }

    const blob = new Blob([videoFile.buffer], { type: videoFile.mimetype });

    console.log('Uploading video...');
    const uploadedFile = await client.files.upload({
      file: blob,
      config: {
        displayName: videoFile.originalname,
      },
    });

    if (!uploadedFile.name) {
      throw new Error('File upload failed to return a name.');
    }

    console.log('Processing video...');
    const getFile = await waitForFileProcessing(uploadedFile.name);

    const response = await client.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { text },
            {
              fileData: {
                mimeType: getFile.mimeType,
                fileUri: getFile.uri,
              },
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        temperature: 0.5,
        tools,
      },
    });

    res.json(response);
  } catch (error) {
    console.error('Error processing video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/video/upload', upload.single('video'), async (req, res) => {
  try {
    const videoFile = req.file;

    if (!videoFile) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const blob = new Blob([videoFile.buffer], { type: videoFile.mimetype });

    console.log('Uploading video...');
    const uploadedFile = await client.files.upload({
      file: blob,
      config: {
        displayName: videoFile.originalname,
      },
    });

    if (!uploadedFile.name) {
      throw new Error('File upload failed to return a name.');
    }

    console.log('Processing video...');
    const getFile = await waitForFileProcessing(uploadedFile.name);

    res.json(getFile);
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/video/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Video understanding server running on port ${port}`);
});