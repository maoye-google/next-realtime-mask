/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import {FunctionDeclaration, GoogleGenAI} from '@google/genai';

const systemInstruction = `When given a video and a query, call the relevant \
function only once with the appropriate timecodes and text for the video`;

// For frontend applications, we'll use API key authentication as primary method
// Service account authentication should be handled by the backend/proxy
// 
// In production, consider implementing a backend proxy that:
// 1. Handles service account authentication server-side
// 2. Forwards requests to Vertex AI
// 3. Returns responses to the frontend
//
// For now, using API key authentication which works in browser environment
const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY,
});

async function generateContent(
  text: string,
  functionDeclarations: FunctionDeclaration[],
  file: any,
  model: string = 'gemini-2.0-flash-exp',
) {
  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          {text},
          {
            fileData: {
              mimeType: file.mimeType,
              fileUri: file.uri,
            },
          },
        ],
      },
    ],
    config: {
      systemInstruction,
      temperature: 0.5,
      tools: [{functionDeclarations}],
    },
  });

  return response;
}

async function uploadFile(file: File) {
  const blob = new Blob([file], {type: file.type});

  console.log('Uploading...');
  const uploadedFile = await client.files.upload({
    file: blob,
    config: {
      displayName: file.name,
    },
  });
  console.log('Uploaded.');
  console.log('Getting...');
  let getFile = await client.files.get({
    name: uploadedFile.name || '',
  });
  while (getFile.state === 'PROCESSING') {
    getFile = await client.files.get({
      name: uploadedFile.name || '',
    });
    console.log(`current file status: ${getFile.state}`);
    console.log('File is still processing, retrying in 5 seconds');

    await new Promise((resolve) => {
      setTimeout(resolve, 5000);
    });
  }
  console.log(getFile.state);
  if (getFile.state === 'FAILED') {
    throw new Error('File processing failed.');
  }
  console.log('Done');
  return getFile;
}

export {generateContent, uploadFile};
