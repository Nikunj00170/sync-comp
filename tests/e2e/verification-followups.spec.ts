import { test, expect } from '@playwright/test';
test('DigiLocker shows an unavailable connection demo instead of manual uploads', async ({
  page,
}) => {
  await page.goto('/#/verification');
  await page.getByRole('button', { name: /^Digio/ }).click();
  await page.getByRole('button', { name: 'Use sample documents' }).click();
  const consent = page.getByRole('checkbox', { name: /I consent to this simulated verification/ });
  await consent.check();
  await expect(page.getByRole('button', { name: 'Complete demo verification' })).toBeEnabled();
  await page.getByRole('button', { name: /^DigiLocker/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Connect DigiLocker', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Demo only — DigiLocker connection is not available yet.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Connect DigiLocker (unavailable in demo)' }),
  ).toBeDisabled();
  await expect(page.getByLabel('Add verification documents')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Use sample documents' })).toHaveCount(0);
  await expect(consent).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Complete demo verification' })).toBeDisabled();
  await page.getByRole('button', { name: /^Digio/ }).click();
  await expect(page.getByText('Sample_business_registration.pdf', { exact: true })).toBeVisible();
  await consent.check();
  await page.getByRole('button', { name: 'Complete demo verification' }).click();
  await expect(
    page.getByRole('heading', { name: 'You’re ready for your next step.' }),
  ).toBeVisible();
});
