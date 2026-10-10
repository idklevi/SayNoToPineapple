import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'node:fs';
import { GoogleGenAI } from '@google/genai';
import { WebSocket, WebSocketServer } from 'ws';

// Electron supplies the app root for the packaged CommonJS bundle; development uses cwd.
const runtimeDir = process.env.GHOST_APP_DIR || process.cwd();
const envCandidates = [
  process.env.GHOST_ENV_PATH,
  path.resolve(process.cwd(), '.env'),
  path.resolve(runtimeDir, '.env'),
].filter((candidate): candidate is string => Boolean(candidate));
for (const envPath of [...new Set(envCandidates)]) {
  dotenv.config({ path: envPath, override: false, quiet: true });
}
const settingsPath = process.env.GHOST_SETTINGS_PATH || path.resolve(process.cwd(), '.ghost-settings.json');
let savedSettings: Record<string, string> = {};
try {
  savedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
} catch {
  // No persisted settings is expected on a first launch.
}

const app = express();
const PORT = 3000;

app.use(express.json());

function getConfiguredEnv(...names: string[]) {
  const value = names.map((name) => savedSettings[name]?.trim() || process.env[name]?.trim()).find(Boolean) || '';
  return /^(your_|my_)/i.test(value) ? '' : value;
}

const getGeminiApiKey = () =>
  getConfiguredEnv('GEMINI_API_KEY', 'GOOGLE_API_KEY', 'VITE_GEMINI_API_KEY');

const getDeepgramApiKey = () =>
  getConfiguredEnv('DEEPGRAM_API_KEY', 'VITE_DEEPGRAM_API_KEY', 'DEEPGRAM_KEY');

function saveSettings() {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(savedSettings, null, 2), { mode: 0o600 });
}

function writeSessionReport(markdown: string) {
  const reportsDir = path.join(path.dirname(settingsPath), 'session-reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportsDir, `ghost-session-${stamp}.md`);
  fs.writeFileSync(reportPath, markdown, { encoding: 'utf8', mode: 0o600 });
  return reportPath;
}

// API Status endpoint
app.get('/api/status', (req, res) => {
  const geminiConfigured = Boolean(getGeminiApiKey());
  const deepgramConfigured = Boolean(getDeepgramApiKey());
  res.json({
    geminiConfigured,
    deepgramConfigured,
  });
});

app.post('/api/settings', (req, res) => {
  const gemini = typeof req.body?.geminiApiKey === 'string' ? req.body.geminiApiKey.trim() : '';
  const deepgram = typeof req.body?.deepgramApiKey === 'string' ? req.body.deepgramApiKey.trim() : '';
  if (gemini) savedSettings.GEMINI_API_KEY = gemini;
  if (deepgram) savedSettings.DEEPGRAM_API_KEY = deepgram;
  if (req.body?.clearGemini) delete savedSettings.GEMINI_API_KEY;
  if (req.body?.clearDeepgram) delete savedSettings.DEEPGRAM_API_KEY;
  saveSettings();
  res.json({ geminiConfigured: Boolean(getGeminiApiKey()), deepgramConfigured: Boolean(getDeepgramApiKey()) });
});

app.post('/api/session-report', (req, res) => {
  const markdown = typeof req.body?.markdown === 'string' ? req.body.markdown : '';
  if (!markdown.trim()) return res.status(400).json({ error: 'A session report is required.' });
  try {
    const reportPath = writeSessionReport(markdown);
    res.json({ saved: true, reportPath });
  } catch (error: any) {
    console.error('[Ghost Server] could not save session report:', error);
    res.status(500).json({ error: 'Could not save session report locally.' });
  }
});

// Gemini Proxy endpoint
app.post('/api/gemini', async (req, res) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return res.status(503).json({ error: 'Gemini API key not configured on server' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const promptText = req.body?.contents?.[0]?.parts?.[0]?.text || '';
    
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: promptText,
    });

    res.json({
      candidates: [
        {
          content: {
            parts: [{ text: response.text || '' }]
          }
        }
      ]
    });
  } catch (error: any) {
    console.error('[Ghost Server] Gemini error:', error);
    const upstreamStatus = Number(error?.status || error?.statusCode);
    const status = upstreamStatus === 429 ? 429 : 502;
    res.status(status).json({
      error: error?.message || 'Gemini upstream error',
      offlineFallback: status === 429,
    });
  }
});

// Vite Middleware integration for dev and static serving for prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      // Express owns port 3000; Vite only transforms and serves middleware here.
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const staticDir = process.env.GHOST_STATIC_DIR || path.resolve(runtimeDir, 'dist');
    if (!fs.existsSync(path.join(staticDir, 'index.html'))) {
      throw new Error(`Static build was not found at ${staticDir}`);
    }
    app.use(express.static(staticDir));
    app.get('*', (req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(PORT, '127.0.0.1', () => {
      console.log(`[Ghost Server] listening on http://localhost:${PORT}`);
      resolve();
    });
    server.once('error', reject);

    const deepgramWss = new WebSocketServer({ noServer: true });
    server.on('upgrade', (request, socket, head) => {
      const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
      if (requestUrl.pathname !== '/api/deepgram') return socket.destroy();
      const apiKey = getDeepgramApiKey();
      if (!apiKey) {
        socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
        return socket.destroy();
      }
      deepgramWss.handleUpgrade(request, socket, head, (client) => {
        const upstream = new WebSocket(`wss://api.deepgram.com/v1/listen${requestUrl.search}`, {
          headers: { Authorization: `Token ${apiKey}` },
        });
        const pendingAudio: Array<{ data: Buffer; isBinary: boolean }> = [];
        let receivedChunks = 0;
        let forwardedChunks = 0;
        const forwardAudio = (data: Buffer, isBinary: boolean) => {
          if (upstream.readyState !== WebSocket.OPEN) return false;
          forwardedChunks += 1;
          upstream.send(data, { binary: isBinary }, (error) => {
            if (error) console.error('[Ghost Server] Deepgram audio forwarding failed:', error.message);
            else console.debug(`[Ghost Server] Forwarded audio chunk ${forwardedChunks} (${data.length} bytes).`);
          });
          return true;
        };
        const closeBoth = () => {
          if (client.readyState === WebSocket.OPEN) client.close();
          if (upstream.readyState === WebSocket.OPEN) upstream.close();
        };
        client.on('message', (data, isBinary) => {
          const audio = Array.isArray(data) ? Buffer.concat(data) : (Buffer.isBuffer(data) ? data : Buffer.from(data));
          receivedChunks += 1;
          console.debug(`[Ghost Server] Received audio chunk ${receivedChunks} (${audio.length} bytes).`);
          if (!forwardAudio(audio, isBinary)) {
            if (pendingAudio.length >= 100) pendingAudio.shift();
            pendingAudio.push({ data: audio, isBinary });
            console.debug(`[Ghost Server] Queued audio chunk ${receivedChunks} until Deepgram is connected.`);
          }
        });
        upstream.on('open', () => {
          console.info(`[Ghost Server] Deepgram upstream connected; forwarding ${pendingAudio.length} queued audio chunks.`);
          while (pendingAudio.length) {
            const chunk = pendingAudio.shift();
            if (chunk) forwardAudio(chunk.data, chunk.isBinary);
          }
        });
        upstream.on('message', (data, isBinary) => {
          if (client.readyState === WebSocket.OPEN) client.send(data, { binary: isBinary });
        });
        client.on('close', closeBoth);
        client.on('error', closeBoth);
        upstream.on('close', closeBoth);
        upstream.on('error', () => {
          console.error('[Ghost Server] Deepgram upstream connection failed.');
          closeBoth();
        });
      });
    });
  });
}

startServer().catch((error) => {
  console.error('[Ghost Server] failed to start:', error);
  process.exitCode = 1;
});
