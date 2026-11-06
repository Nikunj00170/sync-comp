import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateJson } from './conversation.mjs';
const success = {
  ok: true,
  json: async () => ({
    candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"reply":"OK"}' }] } }],
  }),
};
test('keys rotate in order, and duplicate or blank keys are ignored', async () => {
  const seen = [];
  const options = {
    apiKey: 'rotate-first',
    apiKeys: ['rotate-first', '', undefined, 'rotate-second'],
    fetchImpl: async (url, o) => {
      seen.push(o.headers['x-goog-api-key']);
      return success;
    },
  };
  for (let i = 0; i < 3; i++) await generateJson('test', {}, options);
  assert.deepEqual(seen, ['rotate-first', 'rotate-second', 'rotate-first']);
});
test('quota failure tries the other key once and skips the cooling key next time', async () => {
  const seen = [];
  const options = {
    apiKey: 'quota-first',
    apiKeys: ['quota-second'],
    fetchImpl: async (url, o) => {
      const key = o.headers['x-goog-api-key'];
      seen.push(key);
      if (key === 'quota-first')
        return {
          ok: false,
          status: 429,
          json: async () => ({ error: { details: [{ retryDelay: '60s' }] } }),
        };
      return success;
    },
  };
  await generateJson('test', {}, options);
  await generateJson('test', {}, options);
  assert.deepEqual(seen, ['quota-first', 'quota-second', 'quota-second']);
});
test('both exhausted keys stop without a retry loop', async () => {
  let calls = 0;
  const options = {
    apiKeys: ['both-first', 'both-second'],
    fetchImpl: async () => {
      calls++;
      return {
        ok: false,
        status: 429,
        json: async () => ({ error: { details: [{ retryDelay: '60s' }] } }),
      };
    },
  };
  await assert.rejects(generateJson('test', {}, options), (e) => e.status === 429);
  await assert.rejects(generateJson('test', {}, options), (e) => e.status === 429);
  assert.equal(calls, 2);
});
