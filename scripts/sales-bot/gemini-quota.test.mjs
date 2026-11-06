import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateJson } from './conversation.mjs';
test('daily quota gets one request, safe explanation, and credential-specific cooldown', async () => {
  let calls = 0;
  const options = {
    apiKey: 'daily-test-key',
    fetchImpl: async () => {
      calls++;
      return {
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            details: [
              {
                violations: [
                  {
                    quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier',
                    quotaValue: '20',
                  },
                ],
              },
              { retryDelay: '51998s' },
            ],
          },
        }),
      };
    },
  };
  await assert.rejects(
    generateJson('test', {}, options),
    (e) =>
      e.code === 'GEMINI_DAILY_QUOTA' &&
      e.retryAfterSeconds === 51998 &&
      /daily quota/.test(e.message),
  );
  await assert.rejects(generateJson('test', {}, options), (e) => e.code === 'GEMINI_DAILY_QUOTA');
  assert.equal(calls, 1);
  await assert.rejects(
    generateJson('test', {}, { ...options, apiKey: 'another-test-key' }),
    (e) => e.code === 'GEMINI_DAILY_QUOTA',
  );
  assert.equal(calls, 2);
});
test('temporary rate limit uses provider delay and is not retried immediately', async () => {
  let calls = 0;
  await assert.rejects(
    generateJson(
      'test',
      {},
      {
        apiKey: 'temporary-key',
        fetchImpl: async () => {
          calls++;
          return {
            ok: false,
            status: 429,
            headers: { get: () => '45' },
            json: async () => ({ error: { details: [] } }),
          };
        },
      },
    ),
    (e) => e.code === 'GEMINI_RATE_LIMIT' && e.retryAfterSeconds === 45,
  );
  assert.equal(calls, 1);
});
