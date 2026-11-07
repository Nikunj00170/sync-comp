import { test, expect } from '@playwright/test';
for (const language of [
  { code: 'hi', field: 'व्यवसाय का नाम', save: 'प्रोफ़ाइल सहेजें', heading: 'आपका व्यवसाय, आपका तरीका', name: 'हिन्दी व्यवसाय', search: 'योजनाएँ खोजें' },
  { code: 'mr', field: 'व्यवसायाचे नाव', save: 'प्रोफाइल जतन करा', heading: 'तुमचा व्यवसाय, तुमची पद्धत', name: 'मराठी व्यवसाय', search: 'योजना शोधा' },
]) {
  test(`${language.code}: switching, persistence, forms, product identity and responsive routes`, async ({ page }, info) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('/#/account');
    await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption(language.code);
    await expect(page.locator('html')).toHaveAttribute('lang', language.code);
    await expect(page.getByRole('heading', { name: language.heading })).toBeVisible();
    await page.getByLabel(language.field, { exact: true }).fill(language.name);
    const save = page.getByRole('button', { name: language.save, exact: true });
    if (info.project.name === 'mobile') await save.tap(); else await save.click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', language.code);
    await expect(page.getByLabel(language.field, { exact: true })).toHaveValue(language.name);
    for (const route of ['', 'plans', 'discover', 'checkout', 'verification', 'services', 'orders', 'orders/SYNC-20846', 'billing', 'support', 'account']) {
      await page.goto('/#/' + route);
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), route).toBe(false);
    }
    await page.goto('/#/plans');
    await page.getByLabel(language.search, { exact: true }).fill('Biz Fibre 100');
    await expect(page.getByRole('heading', { name: 'Biz Fibre 100', exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/${language.code}-${info.project.name}.png`, fullPage: true });
    await page.getByRole('combobox', { name: 'भाषा', exact: true }).selectOption('en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.goto('/#/account');
    await expect(page.getByLabel('Business name', { exact: true })).toHaveValue(language.name);
    expect(errors).toEqual([]);
  });
}
