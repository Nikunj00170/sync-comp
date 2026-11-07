import { test, expect } from '@playwright/test';
test('notifications fill a red timer bar and slide out after three seconds', async ({ page }) => {
  await page.clock.install();
  await page.goto('/#/account');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  const toast = page.locator('.toast');
  await expect(toast).toContainText('Your demo business profile is saved.');
  const bar = toast.locator('.toast-progress i');
  await expect(bar).toHaveCSS('animation-duration', '3s');
  await expect(bar).toHaveCSS('background-color', 'rgb(239, 155, 162)');
  await page.clock.runFor(3000);
  await expect(toast).toHaveClass(/leaving/);
  await expect(toast).toHaveCSS('animation-name', 'toast-exit');
  await page.clock.runFor(240);
  await expect(toast).toHaveCount(0);
});
test('notifications remain dismissible with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/account');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await expect(page.locator('.toast')).toHaveCount(0);
});
