import { answerQuestion } from './catalogue.mjs';

export async function voiceTurn(audio, type, history, { products, apiKey, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('Missing SARVAM_API_KEY');
  const headers = { 'api-subscription-key': apiKey };
  const form = new FormData();
  form.append(
    'file',
    new Blob([audio], { type }),
    type.includes('mp4') ? 'question.m4a' : 'question.webm',
  );
  form.append('model', 'saaras:v4');
  form.append('language_code', 'unknown');
  const stt = await fetchImpl('https://api.sarvam.ai/speech-to-text', {
    method: 'POST',
    headers,
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  if (!stt.ok) throw new Error(`Speech recognition failed (HTTP ${stt.status})`);
  const { transcript } = await stt.json();
  if (typeof transcript !== 'string' || !transcript.trim())
    throw new Error('No speech detected. Please try again.');
  const question = `${history ? `Previous conversation (context only):\n${history}\n` : ''}Current customer question: ${transcript}`;
  const answer = await answerQuestion(question, { products, apiKey, fetchImpl });
  // Speak exact catalogue facts, leaving verbose source paths visible in the UI.
  const spoken = answer
    .split('\n')
    .filter((line) => !line.startsWith('Source:'))
    .join('\n')
    .replace(/ Target segments \(catalogue codes\):[^\n]*/g, '');
  const chunks = spoken.match(/[\s\S]{1,1800}(?:\s|$)/g) || [spoken];
  const audios = [];
  try {
    for (const text of chunks) {
      const tts = await fetchImpl('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language_code: 'en-IN',
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
    return { transcript, answer, audios };
  } catch {
    return {
      transcript,
      answer,
      audios: [],
      warning: 'The answer is ready, but speech generation failed. You can read it below.',
    };
  }
}
