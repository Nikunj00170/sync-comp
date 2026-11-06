import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalogue, parseCatalogue, renderSelection, answerQuestion } from './catalogue.mjs';

test('loads actual CSV and preserves quoted descriptions, INR and dependencies', async () => {
  const products = await loadCatalogue();
  assert.equal(products.length, 25);
  assert.equal(products[0].description, 'Business fibre broadband, 100 Mbps, unlimited data');
  const answer = renderSelection({ status: 'matched', product_ids: ['P09'] }, products);
  assert.match(answer, /INR 499–599 per site/);
  assert.match(answer, /P01\|P02\|P03\|P05\|P06/);
  assert.match(answer, /case_source\/product_catalogue.csv — product_id=P09/);
});

test('refuses invented citations and malformed CSV', async () => {
  const products = await loadCatalogue();
  assert.throws(
    () => renderSelection({ status: 'matched', product_ids: ['P99'] }, products),
    /unknown product/,
  );
  assert.throws(() => parseCatalogue('product_id,price_min_inr_per_month\nP01,"10'), /Unclosed/);
  assert.match(
    renderSelection({ status: 'unknown', product_ids: [] }, products),
    /does not contain enough information/,
  );
});

test('API adapter sends source data and renders only validated catalogue facts', async () => {
  const products = await loadCatalogue();
  const answer = await answerQuestion('Compare fibre 100 and 300', {
    products,
    apiKey: 'test-key',
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.sarvam.ai/v1/chat/completions');
      const body = JSON.parse(options.body);
      assert.match(body.messages[0].content, /Biz Fibre 100/);
      assert.equal(options.headers['api-subscription-key'], 'test-key');
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              finish_reason: 'stop',
              message: { content: '{"status":"matched","product_ids":["P01","P02"]}' },
            },
          ],
        }),
      };
    },
  });
  assert.match(answer, /INR 999–1199/);
  assert.match(answer, /product_id=P02/);
});

test('provider errors and truncated responses fail without a fabricated answer', async () => {
  const options = { products: await loadCatalogue(), apiKey: 'test-key' };
  await assert.rejects(
    answerQuestion('fibre', { ...options, fetchImpl: async () => ({ ok: false, status: 403 }) }),
    /HTTP 403/,
  );
  await assert.rejects(
    answerQuestion('fibre', {
      ...options,
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ choices: [{ finish_reason: 'length' }] }),
      }),
    }),
    /incomplete/,
  );
});
