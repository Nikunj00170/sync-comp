import { test } from 'node:test';
import assert from 'node:assert/strict';
import { converse, buildBundle } from './conversation.mjs';
import { loadCatalogue } from './catalogue.mjs';
const profile = {
  business: 'shop',
  needs: 'broadband and backup',
  budget: 2000,
  employees: 3,
  sites: 1,
  tier: 2,
  gstin: false,
};
const response = (value) => ({
  ok: true,
  json: async () => ({
    candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(value) }] } }],
  }),
});

test('elicits requirements across turns and switches reply language without losing profile', async () => {
  const products = await loadCatalogue();
  let n = 0;
  const first = await converse(
    'मेरी दुकान है',
    'hi-IN',
    {},
    {
      products,
      apiKey: 'test',
      fetchImpl: async (url, options) => {
        assert.ok(url.startsWith('https://generativelanguage.googleapis.com/'));
        const body = JSON.parse(options.body);
        if (n++ === 0)
          return response({
            requirements: { business: 'shop' },
            language_code: 'hi-IN',
            lines: [],
          });
        const input = JSON.parse(body.contents[0].parts[0].text);
        assert.ok(input.missing.includes('budget'));
        assert.match(body.systemInstruction.parts[0].text, /at most ONE or TWO/);
        assert.match(body.systemInstruction.parts[0].text, /hi-IN/);
        return response({ reply: 'आपकी दुकान के लिए किस तरह की इंटरनेट सेवा चाहिए?' });
      },
    },
  );
  assert.equal(first.requirements.business, 'shop');
  assert.equal(first.bundle, null);
  let stage = 0;
  const second = await converse(
    'Speak English. Broadband and backup, 2000 rupees, 3 employees, 1 site, tier 2, no GST.',
    'en-IN',
    first.nextSession,
    {
      products,
      apiKey: 'test',
      fetchImpl: async (url, options) => {
        const body = JSON.parse(options.body),
          input = JSON.parse(body.contents[0].parts[0].text);
        if (stage++ === 0) {
          assert.equal(input.requirements.business, 'shop');
          assert.equal(input.conversation.length, 1);
          return response({
            requirements: profile,
            language_code: 'en-IN',
            lines: [
              { product_id: 'P01', quantity: 1 },
              { product_id: 'P09', quantity: 1 },
            ],
          });
        }
        assert.equal(input.bundle.monthlyMax, 1798);
        return response({
          reply: 'Fibre 100 with backup fits your needs. Shall we refine this bundle?',
        });
      },
    },
  );
  assert.equal(second.language, 'en-IN');
  assert.equal(second.bundle.monthlyMin, 1498);
  assert.equal(second.bundle.setup, 1500);
  assert.match(second.bundle.items[1].reference, /product_id=P09/);
  assert.equal(second.nextSession.messages.length, 2);
});

test('bundle guard rejects missing dependencies, ineligible plans, over-budget bundles and wrong quantities', async () => {
  const p = await loadCatalogue();
  assert.throws(() => buildBundle([{ product_id: 'P09', quantity: 1 }], profile, p), /dependency/);
  assert.throws(() => buildBundle([{ product_id: 'P03', quantity: 1 }], profile, p), /eligibility/);
  assert.throws(
    () => buildBundle([{ product_id: 'P01', quantity: 1 }], { ...profile, budget: 1000 }, p),
    /budget/,
  );
  assert.throws(
    () => buildBundle([{ product_id: 'P01', quantity: 1 }], { ...profile, sites: 2 }, p),
    /all sites/,
  );
  assert.throws(() => buildBundle([{ product_id: 'P99', quantity: 1 }], profile, p), /Invalid/);
});

test('cannot recommend prematurely or claim an invalid model bundle', async () => {
  let calls = 0;
  const result = await converse(
    'hello',
    'hi-IN',
    {},
    {
      products: await loadCatalogue(),
      apiKey: 'test',
      fetchImpl: async (url, options) => {
        if (calls++ === 0)
          return response({
            requirements: { business: 'shop' },
            language_code: 'hi-IN',
            lines: [{ product_id: 'P01', quantity: 1 }],
          });
        assert.equal(JSON.parse(JSON.parse(options.body).contents[0].parts[0].text).bundle, null);
        return response({ reply: 'आपका मासिक बजट कितना है?' });
      },
    },
  );
  assert.equal(result.bundle, null);
});

test('transient Gemini failure retries once and preserves its JSON response', async () => {
  const { generateJson } = await import('./conversation.mjs');
  let n = 0;
  const result = await generateJson(
    'Reply',
    {},
    {
      apiKey: 'test',
      fetchImpl: async () =>
        ++n === 1 ? { ok: false, status: 503 } : response({ reply: 'Ready' }),
    },
  );
  assert.equal(n, 2);
  assert.equal(result.reply, 'Ready');
});

test('discovery produces extraction and a localized follow-up in one Gemini call', async () => {
  let calls = 0;
  const result = await converse(
    'I run a shop',
    'en-IN',
    {},
    {
      products: await loadCatalogue(),
      apiKey: 'test',
      fetchImpl: async (url, options) => {
        calls++;
        const input = JSON.parse(JSON.parse(options.body).contents[0].parts[0].text);
        assert.equal(input.conversation.length, 0);
        return response({
          requirements: { business: 'shop' },
          language_code: 'en-IN',
          next_field: 'needs',
          reply: 'What services does your shop need?',
          lines: [],
        });
      },
    },
  );
  assert.equal(calls, 1);
  assert.equal(result.route, 'discovery');
  assert.equal(result.nextSession.awaiting, 'needs');
});

test('an unambiguous numeric answer updates the profile and asks the next question without Gemini', async () => {
  const result = await converse(
    '₹2,000',
    'en-IN',
    {
      language: 'en-IN',
      awaiting: 'budget',
      requirements: { business: 'shop', needs: 'internet' },
    },
    {
      products: [],
      fetchImpl: async () => {
        throw new Error('Gemini must not be called');
      },
    },
  );
  assert.equal(result.requirements.budget, 2000);
  assert.equal(result.route, 'local');
  assert.equal(result.nextSession.awaiting, 'sites');
  const hindi = await converse(
    '३',
    'hi-IN',
    { language: 'hi-IN', awaiting: 'employees', requirements: { business: 'shop' } },
    { products: [] },
  );
  assert.equal(hindi.requirements.employees, 3);
  assert.equal(hindi.language, 'hi-IN');
});

test('ambiguous corrections and language switches do not use the local numeric shortcut', async () => {
  const { quickReply } = await import('./quick-reply.mjs');
  const session = { language: 'en-IN', awaiting: 'budget', requirements: {} };
  assert.equal(quickReply('not 2000, 3000 instead', 'en-IN', session), null);
  assert.equal(quickReply('3000 employees', 'en-IN', session), null);
  assert.equal(quickReply('3000', 'hi-IN', session), null);
  assert.equal(quickReply('3000 but I need CCTV', 'en-IN', session), null);
});
