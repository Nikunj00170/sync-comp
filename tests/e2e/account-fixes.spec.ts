import {test, expect} from '@playwright/test';
test('business priority choices have compact controls and spaced touch targets', async ({page}, info) => {
  await page.goto('/#/account');
  const group=page.getByRole('group',{name:'Business priorities'});
  for (const input of await group.getByRole('checkbox').all()) {
    const box=await input.boundingBox();expect(box!.width).toBe(18);expect(box!.height).toBe(18);
  }
  const security=group.getByRole('checkbox',{name:'security',exact:true});
  await security.check();await expect(security).toBeChecked();
  await group.scrollIntoViewIfNeeded();
  await page.screenshot({path:`test-results/priorities-${info.project.name}.png`});
  const overflowing=await group.evaluate(el=>el.scrollWidth>el.clientWidth);expect(overflowing).toBe(false);
});

test('business workspace card opens the editable profile', async ({page}, info) => {
  await page.goto('/');
  if (info.project.name === 'mobile') await page.getByRole('button',{name:'Open navigation'}).click();
  await page.getByRole('link',{name:/Northstar Studio.*Business workspace/}).click();
  await expect(page).toHaveURL(/#\/account/);
  await expect(page.getByLabel('Business name',{exact:true})).toBeVisible();
});
