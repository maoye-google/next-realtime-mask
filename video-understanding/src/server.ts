/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { FunctionDeclaration, GoogleGenAI } from '@google/genai';
import multer from 'multer';

const app = express();
const port = process.env.PORT || 8080;

const systemInstruction = `When given a video and a query, call the relevant \
function only once with the appropriate timecodes and text for the video`;

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB limit
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/readyz', (req, res) => {
  if (process.env.GEMINI_API_KEY) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready', error: 'missing API key' });
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

    console.log('Processing video...');
    let getFile = await client.files.get({
      name: uploadedFile.name || '',
    });

    const maxRetries = 24; // 24 retries * 5 seconds = 2 minute timeout
    let attempt = 0;
    while (getFile.state === 'PROCESSING' && attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      getFile = await client.files.get({
        name: uploadedFile.name || '',
      });
      console.log(`Current file status: ${getFile.state}`);
      attempt++;
    }

    if (getFile.state === 'PROCESSING') {
      await client.files.delete({ name: uploadedFile.name || '' });
      throw new Error('Video processing timed out');
    }

    if (getFile.state === 'FAILED') {
      throw new Error('Video processing failed');
    }

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

    console.log('Processing video...');
    let getFile = await client.files.get({
      name: uploadedFile.name || '',
    });

    const maxRetries = 24; // 24 retries * 5 seconds = 2 minute timeout
    let attempt = 0;
    while (getFile.state === 'PROCESSING' && attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      getFile = await client.files.get({
        name: uploadedFile.name || '',
      });
      console.log(`Current file status: ${getFile.state}`);
      attempt++;
    }

    if (getFile.state === 'PROCESSING') {
      await client.files.delete({ name: uploadedFile.name || '' });
      throw new Error('Video processing timed out');
    }

    if (getFile.state === 'FAILED') {
      throw new Error('Video processing failed');
    }

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