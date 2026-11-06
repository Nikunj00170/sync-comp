import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textTurn } from './text-turn.mjs';
import { loadCatalogue } from './catalogue.mjs';
test('text advisor requires consent, bounded input and supported language before contacting a provider', async () => {
  let called = false;
  const options = {fetchImpl: async () => {called = true;}};
  for (const input of [{message:'hello',language:'en-IN'}, {consent:true,message:'',language:'en-IN'}, {consent:true,message:'x'.repeat(2001),language:'en-IN'}, {consent:true,message:'hello',language:'xx'}])
    await assert.rejects(() => textTurn(input, {}, options), error => error.status === 400);
  assert.equal(called,false);
});
test('typed Hindi discovery reuses catalogue-constrained GenAI conversation', async () => {
  const result = await textTurn({consent:true,message:'मेरे कार्यालय में सहयोग के लिए उपकरण चाहिए',language:'hi-IN'}, {}, {
    products:await loadCatalogue(), apiKey:'test', fetchImpl:async () => ({ok:true,json:async () => ({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({requirements:{business:'office',needs:'collaboration'},language_code:'hi-IN',next_field:'budget',reply:'आपका मासिक बजट कितना है?',lines:[]})}]}}]})})
  });
  assert.equal(result.language,'hi-IN');assert.equal(result.bundle,null);assert.equal(result.nextSession.requirements.business,'office');
});
