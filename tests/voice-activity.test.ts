import { describe, it, expect } from 'vitest';
import { createVoiceActivity } from '../apps/customer/src/lib/voiceActivity';
describe('hands-free turn detection', () => {
  it('sends only after sustained speech and the configured quiet period', () => {
    const step = createVoiceActivity(1400);
    expect(step(0, 0).finished).toBe(false);
    expect(step(0.05, 100).heard).toBe(false);
    expect(step(0.05, 200).heard).toBe(false);
    expect(step(0.05, 300).heard).toBe(true);
    expect(step(0, 1600).finished).toBe(false);
    expect(step(0, 1700).finished).toBe(true);
  });
  it('ignores isolated clicks and restarts the pause when speech resumes', () => {
    const step = createVoiceActivity(1000);
    step(0.05, 100);
    step(0, 200);
    step(0.05, 300);
    step(0, 400);
    expect(step(0, 4000).finished).toBe(false);
    step(0.05, 4100);
    step(0.05, 4200);
    step(0.05, 4300);
    expect(step(0, 5100).finished).toBe(false);
    step(0.05, 5200);
    expect(step(0, 6100).finished).toBe(false);
    expect(step(0, 6200).finished).toBe(true);
  });
});
