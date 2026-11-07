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
  await expect(page.getByLabel('Business name', { exact: true })).toBeVisible();
  await page.getByLabel('Business name', { exact: true }).fill('Balaji Realty LLP');
  await page.getByLabel('Your name', { exact: true }).fill('Cloud Customer');
  await page.getByLabel('Email address', { exact: true }).fill('contact@example.com');
  await page.getByLabel('City', { exact: true }).fill('Bengaluru');
  await page.getByLabel('Team size', { exact: true }).fill('8');
  await page.getByLabel('Business address', { exact: true }).fill('Shop/Unit 38, Civil Lines, Kochi, Kerala - 752083');
  await page.getByRole('checkbox', { name: 'productivity', exact: true }).check();
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(
    page.getByText('Your business profile is saved to your account.', { exact: true }),
  ).toBeVisible();
  const saved = await context.request.get(api + '/v1/me', {
    headers: { Authorization: 'Bearer ' + user.access_token },
  });
  expect((await saved.json()).business).toBe('Balaji Realty LLP');
  const returning = await browser.newContext();
  try {
    await login(returning, info.project.name === 'desktop' ? 0 : 1);
    const account = await returning.newPage();
    await account.goto('http://127.0.0.1:5174/#/account');
    await expect(account.getByLabel('Business name', { exact: true })).toBeVisible();
    await expect(account.getByLabel('Business name', { exact: true })).toHaveValue('Balaji Realty LLP');
    await expect(account.getByLabel('City', { exact: true })).toHaveValue('Bengaluru');
  } finally {
    await returning.close();
  }
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
  await expect(page.getByRole('button', { name: 'Pay now (demo)' })).toBeDisabled();
  await page.getByRole('link', { name: 'Complete verification' }).click();
  await page.getByRole('button', { name: /^DigiLocker/ }).click();
  await expect(
    page.getByRole('checkbox', { name: /I consent to OCR extraction/ }),
  ).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Use sample documents' })).toBeHidden();
  await page.getByLabel('Add verification documents').setInputFiles([
    'case_source/kyc_documents/K05_gst_certificate.png',
    'case_source/kyc_documents/K05_address_proof.png',
    'case_source/kyc_documents/K05_signatory_id.png',
  ]);
  await expect(page.getByText('K05_signatory_id.png', { exact: true })).toBeVisible();
  const consent = page.getByRole('checkbox', { name: /I consent to OCR extraction/ });
  await expect(consent).toBeEnabled();
  await consent.check();
  await expect(page.getByRole('button', { name: 'Complete demo verification' })).toBeEnabled();
  await page.getByRole('button', { name: 'Complete demo verification' }).click();
  await page.getByRole('link', { name: 'Back to your bundle' }).click();
  await page.getByRole('checkbox', { name: /I understand this is a demo order/ }).check();
  await expect(page.getByRole('button', { name: 'Pay now (demo)' })).toBeEnabled();
  await page.getByRole('button', { name: 'Pay now (demo)' }).click();
  await page.route(/\/v1\/invoices\?/,route=>route.fulfill({status:429,headers:{'Retry-After':'0'},json:{message:'Too Many Requests'}}));
  await page.getByRole('dialog').getByRole('button',{name:'Simulate successful payment',exact:true}).click();
  await expect(page).toHaveURL(/#\/orders\/SYNC-/);
  const id = page.url().split('/').at(-1)!;
  await expect(page.locator('.demo-payment-receipt').getByText('Demo payment recorded',{exact:true})).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simulate next milestone' })).toBeHidden();
  expect(await page.evaluate(()=>!!sessionStorage.getItem('oidc.user:https://issuer.test.example/pool:test-app-client'))).toBe(true);
  await page.unroute(/\/v1\/invoices\?/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your connection journey' })).toBeVisible();
  await page.goto('/#/billing');
  await expect(page.locator('.invoice-id')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Try demo payment' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Demo pay/ })).toBeVisible();
  const apiInvoicesBefore = await (await context.request.get(api + '/v1/invoices',{headers:{Authorization:'Bearer '+user.access_token}})).json();
  expect(apiInvoicesBefore[0].status).toBe('unpaid');
  let paymentApiCalls = 0;
  const countPayments = (request: import('@playwright/test').Request) => {if (request.method()==='POST') paymentApiCalls++;};
  page.on('request',countPayments);
  await page.getByRole('button',{name:'Try demo payment',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Simulate successful payment',exact:true}).click();
  await expect(page.getByText('Paid in demo',{exact:true})).toBeVisible();
  expect(paymentApiCalls).toBe(0);
  page.off('request',countPayments);
  await page.reload();
  await expect(page.getByText('Paid in demo',{exact:true})).toBeVisible();
  const apiInvoicesAfter = await (await context.request.get(api + '/v1/invoices',{headers:{Authorization:'Bearer '+user.access_token}})).json();
  expect(apiInvoicesAfter[0].status).toBe('unpaid');
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
  await expect(page.getByLabel('Business name', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('hi');
  await page.getByLabel('व्यवसाय का नाम', { exact: true }).fill('नया सुरक्षित व्यवसाय');
  await page.getByRole('combobox', { name: 'उद्योग', exact: true }).selectOption('retail');
  const save = page.getByRole('button', { name: 'प्रोफ़ाइल सहेजें', exact: true });
  if (info.project.name === 'mobile') await save.tap(); else await save.click();
  await expect(page.getByText('आपका व्यावसायिक प्रोफ़ाइल खाते में सहेजा गया।', { exact: true })).toBeVisible();
  const saved = await context.request.get(api + '/v1/me', { headers: { Authorization: 'Bearer ' + user.access_token } });
  expect(await saved.json()).toMatchObject({ business: 'नया सुरक्षित व्यवसाय', industry: 'retail', priorities: ['productivity'] });
  await page.reload();
  await expect(page.getByLabel('व्यवसाय का नाम', { exact: true })).toHaveValue('नया सुरक्षित व्यवसाय');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
});


test('supplied cancelled-registration documents require review and revoked consent stops extraction', async ({page, context}, info) => {
  const user = await login(context, info.project.name === 'desktop' ? 10 : 11);
  const headers = {Authorization: 'Bearer ' + user.access_token};
  const profile = {name: 'Neha Kaur', business: 'Vindhya Tours & Travels', email:'review@example.com', industry:'professional', city:'Visakhapatnam', tier:2, employees:3, sites:1, budget:5000, hasGstin:true, priorities:['connectivity'],address:'Shop/Unit 1, Tech Park Road, Visakhapatnam, Andhra Pradesh - 118383',phone:''};
  expect((await context.request.put(api + '/v1/me',{headers,data:profile})).status()).toBe(200);
  expect((await context.request.post(api + '/v1/kyc/assessment',{headers})).status()).toBe(409);
  await page.goto('/#/verification');
  await page.getByRole('button',{name:/^DigiLocker/}).click();
  // Provider selection persists asynchronously; wait before starting the next action.
  await expect(page.getByRole('checkbox',{name:/I consent to OCR extraction/})).toBeEnabled();
  await page.getByLabel('Add verification documents').setInputFiles(['case_source/kyc_documents/K01_gst_certificate.png','case_source/kyc_documents/K01_address_proof.png','case_source/kyc_documents/K01_signatory_id.png']);
  await expect(page.getByText('K01_signatory_id.png',{exact:true})).toBeVisible();
  const consent = page.getByRole('checkbox',{name:/I consent to OCR extraction/});
  await consent.check();
  await page.getByRole('button',{name:'Complete demo verification'}).click();
  await expect(page.getByText('Documents need review',{exact:true})).toBeVisible();
  await expect(page.getByText(/GST registration is cancelled or suspended/)).toBeVisible();
  expect((await (await context.request.get(api + '/v1/kyc',{headers})).json()).status).toBe('pending');
  await consent.uncheck();
  await expect(consent).not.toBeChecked();
  expect((await context.request.post(api + '/v1/kyc/assessment',{headers})).status()).toBe(409);
  expect((await context.request.post(api + '/v1/registries/lookup',{headers,data:{kind:'gstin',identifier:'37IHKXV5167L1ZS'}})).status()).toBe(409);
});


test('live account actions follow Cognito session even when account API fails', async ({page, context, browser}, info) => {
  await login(context, info.project.name === 'desktop' ? 12 : 13);
  await page.goto('/#/account');
  await expect(page.getByLabel('Business name', {exact:true})).toBeVisible();
  const panel = page.locator('.account-connection');
  await expect(panel.getByText('Customer API connected.', {exact:true})).toHaveCount(0);
  await expect(panel.getByRole('button',{name:'Sign in with Cognito'})).toHaveCount(0);
  await expect(panel.getByRole('button',{name:'Sign out of live account'})).toBeVisible();
  await page.route('**/v1/me',route=>route.fulfill({status:503,json:{error:{message:'Account temporarily unavailable.'}}}));
  await page.reload();
  await expect(panel.getByText('Account temporarily unavailable.',{exact:true})).toBeVisible();
  await expect(panel.getByRole('button',{name:'Sign in with Cognito'})).toHaveCount(0);
  await page.unroute('**/v1/me');
  const check = panel.getByRole('button',{name:'Check account connection'});
  await check.click();
  await expect(panel.getByRole('status')).toHaveText('Your account connection is working.');
  await expect(page.getByLabel('Business name',{exact:true})).toBeVisible();
  await page.route('**/v1/me',route=>route.fulfill({status:503,json:{error:{message:'Account temporarily unavailable.'}}}));
  await check.click();
  await expect(panel.getByRole('status')).toHaveText('Account temporarily unavailable.');
  await expect(panel.getByText('Your account connection is working.')).toHaveCount(0);
  const signedOut = await browser.newContext();
  const signedOutPage = await signedOut.newPage();
  await signedOutPage.goto('http://127.0.0.1:5174/#/account');
  const signedOutPanel = signedOutPage.locator('.account-connection');
  await expect(signedOutPanel.getByRole('button',{name:'Sign in with Cognito'})).toBeVisible();
  await expect(signedOutPanel.getByRole('button',{name:'Sign out of live account'})).toHaveCount(0);
  await signedOut.close();
});


test('KYC completion 429 preserves login, resumes stored bytes and avoids account-wide upload refreshes', async ({page, context}, info) => {
  const user=await login(context,info.project.name==='desktop'?14:15);
  const headers={Authorization:'Bearer '+user.access_token};
  const profile={name:'Anita Shah',business:'Balaji Realty LLP',email:'kyc@example.com',industry:'professional',city:'Kochi',tier:2,employees:8,sites:1,budget:6000,hasGstin:true,priorities:['productivity'],address:'Shop/Unit 38, Civil Lines, Kochi, Kerala - 752083',phone:''};
  expect((await context.request.put(api+'/v1/me',{headers,data:profile})).status()).toBe(200);
  let profileReads=0;page.on('request',request=>{if(request.url()===api+'/v1/me' && request.method()==='GET') profileReads++;});
  await page.goto('/#/verification');
  await page.getByRole('button',{name:/^DigiLocker/}).click();
  const consent=page.getByRole('checkbox',{name:/I consent to OCR extraction/});await expect(consent).toBeEnabled();
  const before=profileReads;
  let throttle=true;
  await page.route('**/v1/documents/*/complete',async route=>{
    if(throttle){throttle=false;await route.fulfill({status:429,headers:{'Retry-After':'1'},json:{message:'Too Many Requests'}});}else await route.continue();
  });
  await page.getByLabel('Add verification documents').setInputFiles('case_source/kyc_documents/K05_gst_certificate.png');
  await expect(page.getByRole('alert')).toContainText('Too many requests.');
  expect(await page.evaluate(()=>!!sessionStorage.getItem('oidc.user:https://issuer.test.example/pool:test-app-client'))).toBe(true);
  const retry=page.getByRole('button',{name:'Retry upload completion',exact:true});await expect(retry).toBeEnabled();await retry.click();
  await expect(page.locator('.document-list').getByText('K05_gst_certificate.png',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Add verification documents')).toBeEnabled();
  await page.getByLabel('Add verification documents').setInputFiles(['case_source/kyc_documents/K05_address_proof.png','case_source/kyc_documents/K05_signatory_id.png']);
  await expect(page.locator('.document-list').getByText('K05_signatory_id.png',{exact:true})).toBeVisible();await expect(consent).toBeEnabled();
  expect(profileReads).toBe(before);
  await consent.check();await page.getByRole('button',{name:'Complete demo verification'}).click();
  await expect(page.getByRole('heading',{name:'You’re ready for your next step.'})).toBeVisible();
  await page.goto('/#/account');await expect(page.locator('.account-connection').getByRole('button',{name:'Sign in with Cognito'})).toHaveCount(0);
});
