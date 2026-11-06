import { createHash } from 'node:crypto';
import { assertGeminiAvailable } from './gemini-quota.mjs';
const cursors = new Map();
export async function withGeminiKey(options, invoke) {
  const keys = [
    ...new Set(
      [options.apiKey, ...(options.apiKeys || [])]
        .filter((k) => typeof k === 'string' && k.trim())
        .map((k) => k.trim()),
    ),
  ];
  if (!keys.length) throw new Error('Missing GEMINI_API_KEY');
  const model = options.model || 'gemini-3.5-flash';
  const pool = createHash('sha256')
    .update(JSON.stringify([keys, model]))
    .digest('hex');
  const start = (cursors.get(pool) || 0) % keys.length;
  if (cursors.size >= 32 && !cursors.has(pool)) cursors.delete(cursors.keys().next().value);
  let quotaError;
  for (let offset = 0; offset < keys.length; offset++) {
    const index = (start + offset) % keys.length;
    try {
      assertGeminiAvailable(keys[index], model);
    } catch (error) {
      if (error.status !== 429) throw error;
      quotaError = error;
      continue;
    }
    cursors.set(pool, (index + 1) % keys.length);
    try {
      return await invoke({ ...options, apiKey: keys[index], apiKeys: undefined });
    } catch (error) {
      if (error.status !== 429) throw error;
      quotaError = error;
    }
  }
  throw quotaError;
}
