/** Lightweight endpoint detection. Audio stays local until a speech turn is sent. */
export function createVoiceActivity(pauseMs = 1400) {
  let noise = 0.002,
    consecutive = 0,
    lastSpeech = 0,
    heard = false;
  return (rms: number, now: number) => {
    const threshold = Math.max(0.008, Math.min(0.035, noise * 3));
    const speaking = rms > threshold;
    if (speaking) {
      consecutive++;
      lastSpeech = now;
      if (consecutive >= 3) heard = true;
    } else {
      consecutive = 0;
      if (!heard) noise = noise * 0.92 + Math.min(rms, 0.012) * 0.08;
    }
    return {
      heard,
      speaking,
      finished: heard && now - lastSpeech >= pauseMs,
      level: Math.min(1, rms * 12),
    };
  };
}
