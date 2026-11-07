import { test, expect } from '@playwright/test';

test('voice advisor records with consent, shows citations, and clears the call', async ({
  page,
}) => {
  await page.addInitScript(() => {
    class FakeRecorder {
      static isTypeSupported() {
        return true;
      }
      state = 'inactive';
      onstop: (() => void) | null = null;
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['fake audio'], { type: 'audio/webm' }) });
        this.onstop?.();
      }
    }
    Object.defineProperty(window, 'MediaRecorder', { value: FakeRecorder });
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: async () => ({ getTracks: () => [{ stop() {} }] }),
    });
    HTMLMediaElement.prototype.play = async function () {
      this.dispatchEvent(new Event('ended'));
    };
  });
  await page.route('**/api/voice/session', (route) => route.fulfill({ json: { cleared: true } }));
  let requests = 0;
  await page.route('**/api/voice/turn', async (route) => {
    if (requests++) expect(route.request().headers()['x-voice-session']).toBe('test-session');
    expect(route.request().headers()['content-type']).toContain('audio/webm');
    await route.fulfill({
      json: {
        sessionId: 'test-session',
        language: requests === 1 ? 'hi-IN' : 'en-IN',
        transcript: requests === 1 ? 'What is the fibre 100 price?' : 'Please speak English',
        answer:
          'Biz Fibre 100: INR 999–1199 per site. Source: case_source/product_catalogue.csv — product_id=P01',
        audios: ['UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA='],
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Say hello to a smarter start/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Speak to advisor' })).toBeDisabled();
  await dialog.getByRole('checkbox', { name: /I agree to send my recording/ }).check();
  await dialog.getByRole('checkbox', { name: /Continue listening/ }).uncheck();
  await dialog.getByRole('button', { name: 'Speak to advisor' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Listening');
  await dialog.getByRole('button', { name: 'Send question' }).click();
  await expect(dialog.getByText('What is the fibre 100 price?', { exact: true })).toBeVisible();
  await expect(dialog.getByText(/Source: case_source/)).toBeVisible();
  await expect(dialog.getByRole('status')).toHaveText('Ready');
  await expect(dialog.getByRole('heading', { name: /hi-IN/ })).toBeVisible();
  await dialog.getByRole('checkbox', { name: /Continue listening/ }).check();
  await dialog.getByRole('button', { name: 'Speak to advisor' }).click();
  await dialog.getByRole('button', { name: 'Send question' }).click();
  await expect(dialog.getByRole('heading', { name: /en-IN/ })).toBeVisible();
  await expect(dialog.getByRole('status')).toHaveText('Listening');
  await dialog.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Ready');
  await page.screenshot({ path: `test-results/voice-interface-${test.info().project.name}.png` });
  await dialog.getByRole('button', { name: 'End call & clear' }).click();
  await expect(dialog.getByRole('heading', { name: 'You said' })).toHaveCount(0);
});

test('a speech pause sends automatically without clicking Send question', async ({ page }) => {
  await page.addInitScript(() => {
    class Recorder {
      static isTypeSupported() {
        return true;
      }
      state = 'inactive';
      onstop: (() => void) | null = null;
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['voice'], { type: 'audio/webm' }) });
        this.onstop?.();
      }
    }
    let frame = 0;
    class Context {
      resume() {
        return Promise.resolve();
      }
      close() {
        return Promise.resolve();
      }
      createMediaStreamSource() {
        return { connect() {} };
      }
      createAnalyser() {
        return {
          fftSize: 1024,
          getFloatTimeDomainData(samples: Float32Array) {
            samples.fill(frame++ < 5 ? 0.06 : 0);
          },
        };
      }
    }
    Object.defineProperty(window, 'MediaRecorder', { value: Recorder });
    Object.defineProperty(window, 'AudioContext', { value: Context });
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: async () => ({ getTracks: () => [{ stop() {} }] }),
    });
  });
  let requests = 0;
  await page.route('**/api/voice/turn', (route) => {
    requests++;
    return route.fulfill({
      json: {
        sessionId: 'auto-call',
        transcript: 'I run a shop',
        answer: 'What is your monthly budget?',
        audios: [],
      },
    });
  });
  await page.route('**/api/voice/session', (route) => route.fulfill({ json: { cleared: true } }));
  await page.goto('/');
  await page.getByRole('button', { name: /Say hello to a smarter start/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('checkbox', { name: /I agree to send my recording/ }).check();
  await dialog.getByRole('button', { name: 'Speak to advisor' }).click();
  await expect(dialog.getByText('What is your monthly budget?', { exact: true })).toBeVisible();
  expect(requests).toBe(1);
  await expect(dialog.getByRole('status')).toHaveText('Listening');
  await expect(dialog.locator('.voice-stage')).toHaveClass(/is-listening/);
  await dialog.getByRole('button', { name: 'End call & clear' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Ready');
});
