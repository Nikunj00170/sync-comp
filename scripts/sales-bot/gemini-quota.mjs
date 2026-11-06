import { createHash } from 'node:crypto';
const cooldowns = new Map();
const keyFor = (key, model) => createHash('sha256').update(`${key}:${model}`).digest('hex');
export function assertGeminiAvailable(key, model) {
  const id = keyFor(key, model),
    entry = cooldowns.get(id);
  if (!entry) return;
  if (Date.now() >= entry.until) {
    cooldowns.delete(id);
    return;
  }
  throw quotaError(entry.daily, Math.ceil((entry.until - Date.now()) / 1000));
}
function quotaError(daily, seconds) {
  const wait = seconds
    ? ` Provider retry window: about ${seconds >= 3600 ? Math.ceil(seconds / 3600) + ' hours' : seconds >= 60 ? Math.ceil(seconds / 60) + ' minutes' : seconds + ' seconds'}.`
    : '';
  const error = new Error(
    daily
      ? `Gemini daily quota is exhausted for this project/model.${wait} Wait for quota reset or review the project's API billing and limits in Google AI Studio. Repeated retries will not restore quota.`
      : `Gemini is temporarily rate-limited.${wait} Pause the call and try again after the cooldown.`,
  );
  error.status = 429;
  error.code = daily ? 'GEMINI_DAILY_QUOTA' : 'GEMINI_RATE_LIMIT';
  error.retryAfterSeconds = seconds;
  return error;
}
export async function recordGeminiQuota(response, key, model) {
  let data = {};
  try {
    data = await response.json();
  } catch {
    /* Do not expose raw provider error bodies. */
  }
  const details = data.error?.details || [];
  const daily = details.some((d) =>
    d.violations?.some((v) =>
      /perday|per_day|daily/i.test(`${v.quotaId || ''} ${v.quotaMetric || ''}`),
    ),
  );
  const delay = details.find((d) => typeof d.retryDelay === 'string')?.retryDelay;
  const header = response.headers?.get('retry-after');
  const parsed =
    delay?.match(/^(\d+(?:\.\d+)?)s$/)?.[1] || (/^\d+$/.test(header || '') ? header : null);
  const seconds = parsed ? Math.min(86400, Math.max(1, Math.ceil(Number(parsed)))) : 0;
  // Unknown reset time is not presented as an exact reset. Suppress immediate repeats only.
  if (cooldowns.size >= 32) cooldowns.delete(cooldowns.keys().next().value);
  cooldowns.set(keyFor(key, model), { daily, until: Date.now() + (seconds || 30) * 1000 });
  return quotaError(daily, seconds);
}
