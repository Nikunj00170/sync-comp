import { test, expect, type BrowserContext } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const api = 'http://127.0.0.1:18081';
type User = { access_token: string; profile: { sub: string }; expires_at: number };
async function login(context: BrowserContext, index: number) {
  const users: User[] = JSON.parse(await readFile(process.env.SYNC_FRONTEND_AUTH_FILE!, 'utf8'));
  const user = users[index];
  await context.addInitScript(
    (value) =>
      sessionStorage.setItem(
        'oidc.user:https://issuer.test.example/pool:test-app-client',
        JSON.stringify(value),
      ),
    user,
  );
  return user;
}
test('real Spring API: onboarding, recommendations, upload, checkout, invoices, support and isolation', async ({
  page,
  context,
  browser,
}, info) => {
  const user = await login(context, info.project.name === 'desktop' ? 0 : 1);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#/account');
  await expect(page.getByText('Customer API connected.', { exact: true })).toBeVisible();
  await page.getByLabel('Business name', { exact: true }).fill('Connected Studio');
  await page.getByLabel('Your name', { exact: true }).fill('Cloud Customer');
  await page.getByLabel('Email address', { exact: true }).fill('contact@example.com');
  await page.getByLabel('City', { exact: true }).fill('Bengaluru');
  await page.getByLabel('Team size', { exact: true }).fill('8');
  await page.getByLabel('Business address', { exact: true }).fill('24 Studio Road, Bengaluru');
  await page.getByRole('checkbox', { name: 'productivity', exact: true }).check();
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(
    page.getByText('Your business profile is saved to your account.', { exact: true }),
  ).toBeVisible();
  const saved = await context.request.get(api + '/v1/me', {
    headers: { Authorization: 'Bearer ' + user.access_token },
  });
  expect((await saved.json()).business).toBe('Connected Studio');
  await page.goto('/#/discover');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const recommendation = page.waitForResponse((response) =>
    response.url().endsWith('/v1/recommendations'),
  );
  await page.getByRole('button', { name: 'See my matches' }).click();
  expect((await recommendation).ok()).toBe(true);
  await page
    .locator('.recommendation-card.featured')
    .getByRole('button', { name: 'Make this my bundle' })
    .click();
  await expect(page.getByRole('button', { name: 'Place demo order' })).toBeDisabled();
  await page.getByRole('link', { name: 'Complete verification' }).click();
  await page.getByRole('button', { name: /^DigiLocker/ }).click();
  await expect(
    page.getByRole('checkbox', { name: /I consent to this simulated verification/ }),
  ).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Use sample documents' })).toBeHidden();
  await page.getByLabel('Add verification documents').setInputFiles([
    {
      name: 'business.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7\nLocal test registration'),
    },
    {
      name: 'address.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7\nLocal test address'),
    },
  ]);
  await expect(page.getByText('business.pdf', { exact: true })).toBeVisible();
  await expect(page.getByText('address.pdf', { exact: true })).toBeVisible();
  const consent = page.getByRole('checkbox', { name: /I consent to this simulated verification/ });
  await expect(consent).toBeEnabled();
  await consent.check();
  await expect(page.getByRole('button', { name: 'Complete demo verification' })).toBeEnabled();
  await page.getByRole('button', { name: 'Complete demo verification' }).click();
  await page.getByRole('link', { name: 'Back to your bundle' }).click();
  await page.getByRole('checkbox', { name: /I understand this is a demo order/ }).check();
  await expect(page.getByRole('button', { name: 'Place demo order' })).toBeEnabled();
  await page.getByRole('button', { name: 'Place demo order' }).click();
  await expect(page).toHaveURL(/#\/orders\/SYNC-/);
  const id = page.url().split('/').at(-1)!;
  await expect(page.getByRole('button', { name: 'Simulate next milestone' })).toBeHidden();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your connection journey' })).toBeVisible();
  await page.goto('/#/billing');
  await expect(page.locator('.invoice-id')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Try demo payment' })).toBeHidden();
  await expect(page.getByRole('button', { name: /Demo pay/ })).toBeHidden();
  await page.goto('/#/support');
  await page.getByRole('button', { name: 'Create demo request' }).click();
  await page.getByLabel('Subject', { exact: true }).fill('Cloud support request');
  await page
    .getByLabel('A little more detail')
    .fill('Please review my customer account installation.');
  await page.getByRole('button', { name: 'Save demo request' }).click();
  await expect(page.getByText('Cloud support request', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mark resolved' }).click();
  await page.reload();
  await expect(page.getByText('resolved', { exact: true })).toBeVisible();
  const another = await browser.newContext();
  const other = await login(another, info.project.name === 'desktop' ? 2 : 3);
  const otherPage = await another.newPage();
  await otherPage.goto('http://127.0.0.1:5174/#/orders');
  await expect(otherPage.locator('.order-card')).toHaveCount(0);
  const forbidden = await another.request.get(api + '/v1/orders/' + id, {
    headers: { Authorization: 'Bearer ' + other.access_token },
  });
  expect(forbidden.status()).toBe(404);
  await another.close();
  expect(await page.evaluate(() => localStorage.getItem('airtel-sync:customer:v1'))).toBeNull();
  expect(errors).toEqual([]);
});

test('API failure stays an error and never seeds a demo account', async ({
  page,
  context,
}, info) => {
  await login(context, info.project.name === 'desktop' ? 4 : 5);
  await page.route('**/v1/orders?*', (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: { code: 'STORAGE_UNAVAILABLE', message: 'Storage is temporarily unavailable.' },
      },
    }),
  );
  await page.goto('/#/');
  await expect(
    page.getByRole('heading', { name: 'Your workspace could not be loaded' }),
  ).toBeVisible();
  await expect(page.getByText('Northstar Studio', { exact: true })).toHaveCount(0);
  await expect(
    page.getByText('Storage is temporarily unavailable.', { exact: true }),
  ).toBeVisible();
  await page.unroute('**/v1/orders?*');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No invoices yet' })).toBeVisible();
});

test('pagination loads every customer ticket beyond the first hundred', async ({
  page,
  context,
}, info) => {
  const user = await login(context, info.project.name === 'desktop' ? 6 : 7);
  for (let start = 0; start < 101; start += 10) {
    const results = await Promise.all(
      Array.from({ length: Math.min(10, 101 - start) }, (_, offset) =>
        context.request.post(api + '/v1/tickets', {
          headers: { Authorization: 'Bearer ' + user.access_token },
          data: {
            subject: 'Support item ' + (start + offset),
            category: 'Account',
            description: 'This is an integration pagination test.',
          },
        }),
      ),
    );
    for (const result of results) expect(result.status()).toBe(201);
  }
  await page.goto('/#/support');
  await expect(page.locator('.ticket-list article')).toHaveCount(101);
});

test('Hindi controls preserve canonical API fields and cloud records', async ({ page, context }, info) => {
  const user = await login(context, info.project.name === 'desktop' ? 8 : 9);
  const profile = { name: 'आन्या शर्मा', business: 'सुरक्षित व्यवसाय', email: 'cloud@example.com', industry: 'professional', city: 'पुणे', tier: 1, employees: 8, sites: 1, budget: 6000, hasGstin: true, priorities: ['productivity'], address: '२४, पुणे, महाराष्ट्र', phone: '' };
  expect((await context.request.put(api + '/v1/me', { headers: { Authorization: 'Bearer ' + user.access_token }, data: profile })).status()).toBe(200);
  await page.goto('/#/account');
  await expect(page.getByText('Customer API connected.', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('hi');
  await page.getByLabel('व्यवसाय का नाम', { exact: true }).fill('नया सुरक्षित व्यवसाय');
  await page.getByLabel('उद्योग', { exact: true }).selectOption('retail');
  const save = page.getByRole('button', { name: 'प्रोफ़ाइल सहेजें', exact: true });
  if (info.project.name === 'mobile') await save.tap(); else await save.click();
  await expect(page.getByText('आपका व्यावसायिक प्रोफ़ाइल खाते में सहेजा गया।', { exact: true })).toBeVisible();
  const saved = await context.request.get(api + '/v1/me', { headers: { Authorization: 'Bearer ' + user.access_token } });
  expect(await saved.json()).toMatchObject({ business: 'नया सुरक्षित व्यवसाय', industry: 'retail', priorities: ['productivity'] });
  await page.reload();
  await expect(page.getByLabel('व्यवसाय का नाम', { exact: true })).toHaveValue('नया सुरक्षित व्यवसाय');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
});
