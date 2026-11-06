import { test } from 'node:test';
import assert from 'node:assert/strict';
import { voiceTurn } from './voice.mjs';
import { loadCatalogue } from './catalogue.mjs';
const json = (value) => ({ ok: true, json: async () => value });
const gemini = (value) =>
  json({
    candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(value) }] } }],
  });

test('browser MIME fix, Hindi detection, Gemini follow-up and Hindi speech use separate credentials', async () => {
  let chatCalls = 0;
  const result = await voiceTurn(
    Buffer.from('recording'),
    'audio/webm;codecs=opus',
    {},
    {
      apiKey: 'speech-key',
      geminiApiKey: 'reasoning-key',
      products: await loadCatalogue(),
      fetchImpl: async (url, options) => {
        if (url.endsWith('/speech-to-text')) {
          assert.equal(options.headers['api-subscription-key'], 'speech-key');
          assert.equal(options.body.get('file').type, 'audio/webm');
          assert.equal(options.body.get('file').name, 'question.webm');
          assert.equal(options.body.get('language_code'), 'unknown');
          return json({ transcript: 'मेरी दुकान है', language_code: 'hi-IN' });
        }
        if (url.endsWith(':generateContent')) {
          assert.equal(options.headers['x-goog-api-key'], 'reasoning-key');
          assert.equal(options.headers['api-subscription-key'], undefined);
          return gemini(
            chatCalls++ === 0
              ? { requirements: { business: 'shop' }, language_code: 'hi-IN', lines: [] }
              : { reply: 'आपका मासिक बजट कितना है?' },
          );
        }
        const body = JSON.parse(options.body);
        assert.equal(body.language_code, 'hi-IN');
        assert.equal(body.text, 'आपका मासिक बजट कितना है?');
        return json({ audios: ['d2F2'] });
      },
    },
  );
  assert.equal(result.language, 'hi-IN');
  assert.equal(result.nextSession.requirements.business, 'shop');
  assert.deepEqual(result.audios, ['d2F2']);
  assert.equal(chatCalls, 2);
});

test('empty speech stops before reasoning', async () => {
  await assert.rejects(
    voiceTurn(
      Buffer.from('silence'),
      'audio/webm',
      {},
      {
        apiKey: 'test',
        geminiApiKey: 'test',
        products: [],
        fetchImpl: async () => json({ transcript: '' }),
      },
    ),
    /No speech/,
  );
});

test('speech generation failure keeps localized conversation and session', async () => {
  let n = 0;
  const result = await voiceTurn(
    Buffer.from('recording'),
    'audio/mp4',
    {},
    {
      apiKey: 'test',
      geminiApiKey: 'test',
      products: [],
      fetchImpl: async (url) => {
        if (url.endsWith('/speech-to-text'))
          return json({ transcript: 'hello', language_code: 'en-IN' });
        if (url.endsWith(':generateContent'))
          return gemini(
            n++ === 0
              ? { requirements: {}, language_code: 'en-IN', lines: [] }
              : { reply: 'What kind of business do you run?' },
          );
        return { ok: false, status: 429 };
      },
    },
  );
  assert.match(result.answer, /business/);
  assert.match(result.warning, /speech generation failed/);
  assert.deepEqual(result.audios, []);
  assert.equal(result.nextSession.messages.length, 1);
});

test('simple requirement replies bypass Gemini and reuse only fixed follow-up audio', async () => {
  let geminiCalls = 0,
    speechCalls = 0;
  const options = {
    apiKey: 'speech-key',
    geminiApiKey: 'reasoning-key',
    products: [],
    fetchImpl: async (url) => {
      if (url.endsWith('/speech-to-text'))
        return json({ transcript: '2000', language_code: 'en-IN' });
      if (url.endsWith(':generateContent')) {
        geminiCalls++;
        throw new Error('Unexpected Gemini call');
      }
      speechCalls++;
      return json({ audios: ['fixed-prompt-audio'] });
    },
  };
  const session = {
    language: 'en-IN',
    awaiting: 'budget',
    requirements: { business: 'shop', needs: 'internet' },
  };
  const first = await voiceTurn(Buffer.from('audio'), 'audio/webm', session, options);
  const second = await voiceTurn(Buffer.from('audio'), 'audio/webm', session, options);
  assert.equal(geminiCalls, 0);
  assert.equal(speechCalls, 1);
  assert.equal(first.reasoningRoute, 'local');
  assert.equal(second.timings.speechCacheHit, true);
  assert.deepEqual(second.audios, first.audios);
});
