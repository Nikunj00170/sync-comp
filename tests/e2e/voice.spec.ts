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
  await page.route('**/api/voice/turn', async (route) => {
    expect(route.request().headers()['content-type']).toContain('audio/webm');
    await route.fulfill({
      json: {
        transcript: 'What is the fibre 100 price?',
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
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Speak to advisor' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Listening');
  await dialog.getByRole('button', { name: 'Send question' }).click();
  await expect(dialog.getByText('What is the fibre 100 price?', { exact: true })).toBeVisible();
  await expect(dialog.getByText(/Source: case_source/)).toBeVisible();
  await expect(dialog.getByRole('status')).toHaveText('Ready');
  await dialog.getByRole('button', { name: 'End call & clear' }).click();
  await expect(dialog.getByRole('heading', { name: 'You said' })).toHaveCount(0);
});
