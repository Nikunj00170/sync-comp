import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { loadCatalogue } from './catalogue.mjs';
import { voiceTurn } from './voice.mjs';
import { textTurn } from './text-turn.mjs';

// Development only: loopback binding, exact browser origin, no public CORS.
const origin = process.env.VOICE_DEV_ORIGIN || 'http://127.0.0.1:5173';
let busy = false;
const sessions = new Map();
setInterval(() => {
  for (const [id, value] of sessions)
    if (Date.now() - value.updated > 30 * 60_000) sessions.delete(id);
}, 60_000).unref();
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  const reply = (status, body) => {
    res.writeHead(status);
    res.end(JSON.stringify(body));
  };
  if (req.headers.origin !== origin) return reply(403, { error: 'Origin denied' });
  const id = req.headers['x-voice-session'];
  if (req.method === 'DELETE' && req.url === '/api/voice/session') {
    if (typeof id === 'string') sessions.delete(id);
    return reply(200, { cleared: true });
  }
  const chat = req.url === '/api/voice/chat';
  if (req.method !== 'POST' || (!chat && req.url !== '/api/voice/turn'))
    return reply(404, { error: 'Not found' });
  for (const [key, value] of sessions)
    if (Date.now() - value.updated > 30 * 60_000) sessions.delete(key);
  if (id && !sessions.has(id))
    return reply(409, { error: 'Voice session expired. End the call and start again.' });
  if (busy) return reply(429, { error: 'Another voice turn is in progress. Try again shortly.' });
  if (
    !chat && !['audio/webm', 'audio/mp4', 'audio/ogg'].some((t) =>
      req.headers['content-type']?.startsWith(t),
    )
  )
    return reply(415, { error: 'Unsupported recording format' });
  if (chat && !req.headers['content-type']?.startsWith('application/json')) return reply(415, { error: 'JSON required' });
  busy = true;
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > (chat ? 16_000 : 2_000_000)) {
        reply(413, { error: 'Recording exceeds 2 MB' });
        return;
      }
      chunks.push(chunk);
    }
    if (!size) return reply(400, { error: 'Empty recording' });
    const sessionId = id || randomUUID();
    if (!id && sessions.size >= 50)
      return reply(429, { error: 'Too many active calls. Try later.' });
    const options = {
        products: await loadCatalogue(),
        apiKey: process.env.SARVAM_API_KEY,
        geminiApiKey: process.env.GEMINI_API_KEY,
        geminiApiKeys: [process.env.GEMINI_API_KEY_2],
        model: process.env.GEMINI_MODEL,
      };
    let result;
    if (chat) {
      let input;
      try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { return reply(400, { error: 'Invalid JSON' }); }
      result = await textTurn(input, sessions.get(id)?.context || {}, {...options, apiKey: options.geminiApiKey, apiKeys: options.geminiApiKeys});
    } else result = await voiceTurn(Buffer.concat(chunks), req.headers['content-type'], sessions.get(id)?.context || {}, options);
    if (id && !sessions.has(id))
      return reply(409, { error: 'Call ended while processing this turn.' });
    sessions.set(sessionId, { context: result.nextSession, updated: Date.now() });
    const { nextSession, ...response } = result;
    reply(200, { ...response, sessionId });
  } catch (error) {
    // Do not log or return provider bodies, audio, transcripts or credentials.
    reply(error.status === 400 ? 400 : error.status === 429 ? 429 : 502, {
      code: error.status === 429 ? error.code : undefined,
      retryAfterSeconds: error.status === 429 ? error.retryAfterSeconds : undefined,
      error:
        error.status === 400 || error.status === 429 ||
        error.message?.startsWith('Speech recognition failed') ||
        error.message?.startsWith('No speech') ||
        error.message?.startsWith('Gemini request failed (HTTP') ||
        ['Missing SARVAM_API_KEY', 'Missing GEMINI_API_KEY'].includes(error.message)
          ? error.message
          : 'Voice request failed. Check backend credentials, credits and connectivity.',
    });
  } finally {
    busy = false;
  }
});
server.requestTimeout = 15_000;
const port = Number(process.env.VOICE_DEV_PORT || 8787);
server.listen(port, '127.0.0.1', () =>
  console.log(`Advisor backend: http://127.0.0.1:${port} (local development only)`),
);
