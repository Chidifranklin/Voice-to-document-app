import type { IncomingMessage, ServerResponse } from 'http';
import { cleanAndFormatTranscript, transcribeAudioData } from './aiService.ts';

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const url = req.url || '';

  if (!url.startsWith('/api/')) {
    return false;
  }

  // Handle CORS & Preflight if ever needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  if (url === '/api/health' && req.method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', app: 'VoiceDoc', timestamp: new Date().toISOString() }));
    return true;
  }

  // Read JSON body helper
  const readJsonBody = async <T = Record<string, unknown>>(): Promise<T> => {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalLength = 0;
      req.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        totalLength += chunk.length;
        // Limit max body to 50MB for audio
        if (totalLength > 50 * 1024 * 1024) {
          reject(new Error('Payload too large'));
        }
      });
      req.on('end', () => {
        try {
          const str = Buffer.concat(chunks).toString('utf8');
          resolve(str ? JSON.parse(str) : ({} as T));
        } catch (err) {
          reject(new Error('Invalid JSON payload'));
        }
      });
      req.on('error', reject);
    });
  };

  try {
    if (url === '/api/ai/clean-and-format' && req.method === 'POST') {
      const body = await readJsonBody<{
        transcript: string;
        template: string;
        customInstructions?: string;
      }>();

      if (!body.transcript) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Transcript is required' }));
        return true;
      }

      const result = await cleanAndFormatTranscript({
        transcript: body.transcript,
        template: body.template,
        customInstructions: body.customInstructions,
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(result));
      return true;
    }

    if (url === '/api/ai/transcribe' && req.method === 'POST') {
      const body = await readJsonBody<{
        audioBase64: string;
        mimeType: string;
        languageHint?: string;
      }>();

      if (!body.audioBase64) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Audio data is required' }));
        return true;
      }

      const result = await transcribeAudioData({
        audioBase64: body.audioBase64,
        mimeType: body.mimeType || 'audio/webm',
        languageHint: body.languageHint,
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(result));
      return true;
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: `Not found: ${url}` }));
    return true;
  } catch (error: any) {
    console.error('API Error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: error?.message || 'Internal server error' }));
    return true;
  }
}
