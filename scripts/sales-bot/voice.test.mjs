import { test } from 'node:test';
import assert from 'node:assert/strict';
import { voiceTurn } from './voice.mjs';
import { loadCatalogue } from './catalogue.mjs';

test('voice turn transcribes, grounds answer in CSV and synthesizes exact facts', async () => {
  const calls = [];
  const result = await voiceTurn(
    Buffer.from('recording'),
    'audio/webm',
    'Customer: I need broadband',
    {
      apiKey: 'test',
      products: await loadCatalogue(),
      fetchImpl: async (url, options) => {
        calls.push(url);
        if (url.endsWith('/speech-to-text')) {
          assert.equal(options.body.get('model'), 'saaras:v4');
          assert.equal(options.body.get('file').type, 'audio/webm');
          return { ok: true, json: async () => ({ transcript: 'What about fibre 100?' }) };
        }
        if (url.endsWith('/chat/completions')) {
          const body = JSON.parse(options.body);
          assert.match(body.messages[1].content, /I need broadband/);
          return {
            ok: true,
            json: async () => ({
              choices: [
                {
                  finish_reason: 'stop',
                  message: { content: '{"status":"matched","product_ids":["P01"]}' },
                },
              ],
            }),
          };
        }
        const body = JSON.parse(options.body);
        assert.equal(body.model, 'bulbul:v4-flash');
        assert.match(body.text, /INR 999–1199/);
        assert.ok(body.text.length <= 2500);
        assert.doesNotMatch(body.text, /Source:/);
        return { ok: true, json: async () => ({ audios: ['d2F2'] }) };
      },
    },
  );
  assert.equal(calls.length, 3);
  assert.equal(result.transcript, 'What about fibre 100?');
  assert.match(result.answer, /product_id=P01/);
  assert.deepEqual(result.audios, ['d2F2']);
});

test('empty transcripts stop before chat and TTS', async () => {
  await assert.rejects(
    voiceTurn(Buffer.from('silence'), 'audio/webm', '', {
      apiKey: 'test',
      products: [],
      fetchImpl: async () => ({ ok: true, json: async () => ({ transcript: '' }) }),
    }),
    /No speech detected/,
  );
});

test('TTS outage preserves text answer with explicit playback warning', async () => {
  const result = await voiceTurn(Buffer.from('recording'), 'audio/mp4', '', {
    apiKey: 'test',
    products: await loadCatalogue(),
    fetchImpl: async (url) => {
      if (url.endsWith('/speech-to-text'))
        return { ok: true, json: async () => ({ transcript: 'Fibre 100 price?' }) };
      if (url.endsWith('/chat/completions'))
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                finish_reason: 'stop',
                message: { content: '{"status":"matched","product_ids":["P01"]}' },
              },
            ],
          }),
        };
      return { ok: false, status: 429 };
    },
  });
  assert.match(result.answer, /product_id=P01/);
  assert.match(result.warning, /speech generation failed/);
  assert.deepEqual(result.audios, []);
});
