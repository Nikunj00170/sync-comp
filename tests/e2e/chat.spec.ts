import {test, expect} from '@playwright/test';
test('typed advisor requires consent, reviews canonical prices and clears context', async ({page}) => {
  let messages = 0, clears = 0;
  await page.route('**/api/voice/session', route => {clears++;return route.fulfill({json:{cleared:true}});});
  await page.route('**/api/voice/chat', async route => {
    const body = route.request().postDataJSON();expect(body.consent).toBe(true);expect(body.language).toBe('en-IN');messages++;
    await route.fulfill({json:{sessionId:'chat-test',answer:'Biz Fibre 100 fits a single site. Confirm the server quote.',bundle:{items:[{product_id:'P01',quantity:1,monthlyMin:1,monthlyMax:1}]}}});
  });
  await page.goto('/');
  await page.getByRole('button',{name:/Say hello to a smarter start/}).click();
  const dialog=page.getByRole('dialog');
  const send=dialog.getByRole('button',{name:'Send message',exact:true});await expect(send).toBeDisabled();
  await dialog.getByRole('checkbox',{name:/I agree to share this conversation/}).check();
  await dialog.getByLabel('Your message',{exact:true}).fill('I need internet for a small shop.');
  await send.click();await expect(dialog.getByText(/Biz Fibre 100 fits/)).toBeVisible();
  await dialog.getByRole('button',{name:'Review suggested bundle'}).click();
  await expect(page).toHaveURL(/#\/checkout/);await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('₹999',{exact:true}).first()).toBeVisible();
  expect(messages).toBe(1);await expect.poll(()=>clears).toBeGreaterThan(0);
});
test('typed provider error offers the questionnaire without invented recommendations', async ({page}) => {
  await page.route('**/api/voice/chat', route=>route.fulfill({status:502,json:{error:'Advisor unavailable. Try the questionnaire.'}}));
  await page.goto('/');await page.getByRole('button',{name:/Say hello to a smarter start/}).click();
  const dialog=page.getByRole('dialog');await dialog.getByRole('checkbox',{name:/I agree to share this conversation/}).check();
  await dialog.getByLabel('Your message',{exact:true}).fill('Help me choose');await dialog.getByRole('button',{name:'Send message',exact:true}).click();
  await expect(dialog.getByRole('alert')).toHaveText('Advisor unavailable. Try the questionnaire.');
  await expect(dialog.getByRole('button',{name:'Review suggested bundle'})).toHaveCount(0);
});
