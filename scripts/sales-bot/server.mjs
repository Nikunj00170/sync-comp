import { createServer } from 'node:http';
import { loadCatalogue } from './catalogue.mjs';
import { voiceTurn } from './voice.mjs';

// Development only: loopback binding, exact browser origin, no public CORS.
const origin = process.env.VOICE_DEV_ORIGIN || 'http://127.0.0.1:5173';
let busy = false;
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  const reply = (status, body) => {
    res.writeHead(status);
    res.end(JSON.stringify(body));
  };
  if (req.method !== 'POST' || req.url !== '/api/voice/turn')
    return reply(404, { error: 'Not found' });
  if (req.headers.origin !== origin) return reply(403, { error: 'Origin denied' });
  if (busy) return reply(429, { error: 'Another voice turn is in progress. Try again shortly.' });
  if (
    !['audio/webm', 'audio/mp4', 'audio/ogg'].some((t) =>
      req.headers['content-type']?.startsWith(t),
    )
  )
    return reply(415, { error: 'Unsupported recording format' });
  busy = true;
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 2_000_000) {
        reply(413, { error: 'Recording exceeds 2 MB' });
        return;
      }
      chunks.push(chunk);
    }
    if (!size) return reply(400, { error: 'Empty recording' });
    let history = '';
    try {
      history = decodeURIComponent(req.headers['x-voice-history'] || '');
    } catch {
      return reply(400, { error: 'Invalid history' });
    }
    if (history.length > 2200) return reply(400, { error: 'Conversation context too long' });
    reply(
      200,
      await voiceTurn(Buffer.concat(chunks), req.headers['content-type'], history, {
        products: await loadCatalogue(),
        apiKey: process.env.SARVAM_API_KEY,
      }),
    );
  } catch (error) {
    // Do not log or return provider bodies, audio, transcripts or credentials.
    reply(502, {
      error:
        error.message?.startsWith('Speech recognition failed') ||
        error.message?.startsWith('No speech') ||
        error.message === 'Missing SARVAM_API_KEY'
          ? error.message
          : 'Voice request failed. Check backend credentials, credits and connectivity.',
    });
  } finally {
    busy = false;
  }
});
server.requestTimeout = 15_000;
server.listen(8787, '127.0.0.1', () =>
  console.log('Voice backend: http://127.0.0.1:8787 (local development only)'),
);
