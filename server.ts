import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { handleApiRequest } from './server/apiHandler.ts';
import { setupLiveWebSocket } from './server/liveService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// API routes handled directly
app.use('/api', (req, res, next) => {
  handleApiRequest(req, res).then((handled) => {
    if (!handled) next();
  }).catch(next);
});

// Serve static assets from dist
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/live' });
setupLiveWebSocket(wss);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`VoiceDoc server running on http://0.0.0.0:${PORT}`);
});
