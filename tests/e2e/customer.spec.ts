import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('discover → verify → order → tracking → billing survives reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#/discover');
  await page.getByLabel('Business name', { exact: true }).fill('Orbit Design Studio');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('People in your team').fill('8');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'See my matches' }).click();
  await expect(page.getByRole('heading', { name: /Your business. Your best fit/ })).toBeVisible();
  await page
    .locator('.recommendation-card.featured')
    .getByRole('button', { name: 'Make this my bundle' })
    .click();
  await expect(page.getByRole('button', { name: 'Place demo order' })).toBeDisabled();
  await page.getByRole('link', { name: 'Complete verification' }).click();
  await page.getByRole('button', { name: /^DigiLocker/ }).click();
  await page.getByRole('button', { name: 'Use sample documents' }).click();
  await page.getByRole('checkbox', { name: /I consent to this simulated verification/ }).check();
  await page.getByRole('button', { name: 'Complete demo verification' }).click();
  await page.getByRole('link', { name: 'Back to your bundle' }).click();
  await page.getByRole('checkbox', { name: /I understand this is a demo order/ }).check();
  await page.getByRole('button', { name: 'Place demo order' }).click();
  await expect(page.getByRole('heading', { name: 'Your connection journey' })).toBeVisible();
  const orderUrl = page.url();
  await page.getByRole('button', { name: 'Simulate next milestone' }).click();
  await expect(page.locator('.timeline-step.current h3')).toHaveText('Verification');
  await page.reload();
  await expect(page.locator('.timeline-step.current h3')).toHaveText('Verification');
  expect(page.url()).toBe(orderUrl);
  await page.goto('/#/billing');
  const pdf = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download INV-2026-0042', exact: true }).click();
  const downloaded = await pdf;
  expect(downloaded.suggestedFilename()).toBe('INV-2026-0042.pdf');
  const path = await downloaded.path();
  expect((await readFile(path!)).subarray(0, 5).toString()).toBe('%PDF-');
  await page.getByRole('button', { name: 'Try demo payment' }).click();
  await page.getByRole('button', { name: 'Simulate successful payment' }).click();
  await expect(page.getByRole('button', { name: 'Try demo payment' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Try demo payment' })).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('catalogue dependencies, comparison, saved plans and checkout arithmetic', async ({
  page,
}) => {
  await page.goto('/#/plans');
  await page.getByLabel('Search plans', { exact: true }).fill('Biz Fibre');
  const first = page
    .locator('.plan-card')
    .filter({ has: page.getByRole('heading', { name: 'Biz Fibre 100', exact: true }) });
  await first.getByRole('button', { name: 'Save Biz Fibre 100', exact: true }).click();
  await first.getByRole('checkbox', { name: 'Compare plan' }).check();
  const second = page
    .locator('.plan-card')
    .filter({ has: page.getByRole('heading', { name: 'Biz Fibre 300', exact: true }) });
  await second.getByRole('checkbox', { name: 'Compare plan' }).check();
  await page.getByRole('button', { name: 'Compare (2)', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.compare-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByLabel('Search plans', { exact: true }).fill('Managed Wi-Fi');
  await page
    .locator('.plan-card')
    .getByRole('button', { name: 'Add to bundle', exact: true })
    .click();
  await expect(page.getByText('2 services in your bundle', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Review bundle' }).click();
  await expect(page.locator('.cart-line')).toHaveCount(2);
  await page.getByRole('button', { name: 'Increase Biz 5G AirFiber 100 quantity' }).click();
  await expect(page.getByLabel('Biz 5G AirFiber 100 quantity', { exact: true })).toHaveText('2');
  await page.getByRole('button', { name: 'Remove Biz 5G AirFiber 100', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your bundle is a blank canvas.' })).toBeVisible();
  await page.goto('/#/plans');
  await page.getByRole('button', { name: 'Saved (1)', exact: true }).click();
  await expect(page.locator('.plan-card')).toHaveCount(1);
});
test('support form stays focused, saves locally, resolves, and global search works', async ({
  page,
}) => {
  await page.goto('/#/support');
  await page.getByRole('button', { name: 'Create demo request' }).click();
  const subject = page.getByLabel('Subject', { exact: true });
  await subject.pressSequentially('Installation timing', { delay: 30 });
  await expect(subject).toHaveValue('Installation timing');
  await page
    .getByLabel('A little more detail')
    .fill('Please move my sample installation to next week.');
  await page.getByRole('button', { name: 'Save demo request' }).click();
  await expect(page.getByText('Installation timing', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mark resolved' }).click();
  await page.reload();
  await expect(page.getByText('resolved', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Search anything/ }).click();
  await page.getByLabel('Search plans and pages').fill('billing');
  await page.getByRole('dialog').getByRole('button', { name: 'Billing & payments' }).click();
  await expect(page).toHaveURL(/#\/billing/);
});
test('all customer routes fit the viewport and remain usable on mobile', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const route of [
    '',
    'plans',
    'discover',
    'checkout',
    'verification',
    'services',
    'orders',
    'orders/SYNC-20846',
    'billing',
    'support',
    'account',
  ]) {
    await page.goto('/#/' + route);
    await expect(page.locator('h1')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflow, `${route} must not overflow the viewport`).toBe(false);
    if (route === '')
      await page.screenshot({
        path: `test-results/customer-${info.project.name}.png`,
        fullPage: true,
      });
  }
  if (info.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Verification' })
      .click();
    await expect(page.getByRole('heading', { name: /A little verification/ })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('customer pages expose accessible controls and readable content', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  for (const route of ['', 'plans', 'verification', 'billing', 'support', 'account']) {
    await page.goto('/#/' + route);
    await expect(page.locator('h1')).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
      route,
    ).toEqual([]);
  }
});

test('rescheduling preserves India local time in the calendar and cancellation persists', async ({
  page,
}) => {
  await page.goto('/#/orders/SYNC-20846');
  await page.getByRole('button', { name: 'Change demo slot' }).click();
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(Date.now() + 7 * 86400000);
  await page.getByLabel('Installation date and time').fill(day + 'T15:30');
  await page.getByRole('button', { name: 'Save demo slot' }).click();
  await expect(page.locator('.appointment-card > p')).toContainText('3:30');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Add to calendar' }).click();
  const file = await downloading;
  expect(await readFile((await file.path())!, 'utf8')).toContain(
    'DTSTART:' + day.replaceAll('-', '') + 'T100000Z',
  );
  await page.getByRole('button', { name: 'Cancel demo order', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel demo order', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Simulate next milestone' })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Simulate next milestone' })).toBeDisabled();
  await expect(page.locator('.page-heading > .badge')).toHaveText('Cancelled');
});
