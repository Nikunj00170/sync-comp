import { converse } from './conversation.mjs';

// Cache only fixed local follow-up prompts, never personalized customer replies.
const speechCache = new Map();

export async function voiceTurn(
  audio,
  type,
  session = {},
  { products, apiKey, geminiApiKey, geminiApiKeys, model, fetchImpl = fetch },
) {
  const started = performance.now();
  const timings = {};
  if (!apiKey) throw new Error('Missing SARVAM_API_KEY');
  if (!geminiApiKey && !geminiApiKeys?.some((k) => k?.trim()))
    throw new Error('Missing GEMINI_API_KEY');
  const headers = { 'api-subscription-key': apiKey };
  // Sarvam validates MIME types literally; MediaRecorder adds codec parameters.
  const mimeType = type.split(';', 1)[0].trim().toLowerCase();
  const extension = { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg' }[mimeType];
  if (!extension) throw new Error('Unsupported recording format');
  const form = new FormData();
  form.append('file', new Blob([audio], { type: mimeType }), `question.${extension}`);
  form.append('model', 'saaras:v4');
  form.append('language_code', 'unknown');
  const stt = await fetchImpl('https://api.sarvam.ai/speech-to-text', {
    method: 'POST',
    headers,
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  if (!stt.ok) throw new Error(`Speech recognition failed (HTTP ${stt.status})`);
  const { transcript, language_code } = await stt.json();
  if (typeof transcript !== 'string' || !transcript.trim())
    throw new Error('No speech detected. Please try again.');
  timings.sttMs = Math.round(performance.now() - started);
  const reasoningStarted = performance.now();
  const conversation = await converse(transcript, language_code, session, {
    products,
    apiKey: geminiApiKey,
    apiKeys: geminiApiKeys,
    model,
    fetchImpl,
  });
  timings.reasoningMs = Math.round(performance.now() - reasoningStarted);
  const { answer, language, requirements, bundle, nextSession, route } = conversation;
  const speechStarted = performance.now();
  const cacheKey = JSON.stringify([language, answer]);
  const cached = route === 'local' ? speechCache.get(cacheKey) : null;
  if (cached)
    return {
      transcript,
      answer,
      language,
      requirements,
      bundle,
      nextSession,
      audios: cached,
      reasoningRoute: route,
      timings: {
        ...timings,
        ttsMs: 0,
        totalMs: Math.round(performance.now() - started),
        speechCacheHit: true,
      },
    };
  const chunks = [answer];
  const audios = [];
  try {
    for (const text of chunks) {
      const tts = await fetchImpl('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language_code: language,
          model: 'bulbul:v4-flash',
          output_audio_codec: 'wav',
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!tts.ok) throw new Error(`Speech playback generation failed (HTTP ${tts.status})`);
      const result = await tts.json();
      if (
        !Array.isArray(result.audios) ||
        !result.audios.length ||
        result.audios.some((a) => typeof a !== 'string' || !a)
      )
        throw new Error('Empty speech response');
      audios.push(...result.audios);
    }
    if (route === 'local' && audios.join('').length < 500_000) {
      if (speechCache.size >= 16) speechCache.delete(speechCache.keys().next().value);
      speechCache.set(cacheKey, audios);
    }
    timings.ttsMs = Math.round(performance.now() - speechStarted);
    timings.totalMs = Math.round(performance.now() - started);
    return {
      transcript,
      answer,
      audios,
      language,
      requirements,
      bundle,
      nextSession,
      reasoningRoute: route,
      timings,
    };
  } catch {
    timings.ttsMs = Math.round(performance.now() - speechStarted);
    timings.totalMs = Math.round(performance.now() - started);
    return {
      reasoningRoute: route,
      timings,
      transcript,
      answer,
      language,
      requirements,
      bundle,
      nextSession,
      audios: [],
      warning: 'The answer is ready, but speech generation failed. You can read it below.',
    };
  }
}
