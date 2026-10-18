// AIGen staff: the Console needs 2-step sign-in; with it, staff manage companies, plans, flags and legal (spec §7).
import { expect, shot, signInAs, test, totpNow } from './helpers';

test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'the Console is a desktop tool');

let secret = '';

test('staff without 2-step sign-in are sent to set it up, then reach the Console', async ({ page }, info) => {
  await signInAs(page, 'staff@aigen.test', '/console');
  await expect(page).toHaveURL(/\/settings\/security\?staff=1/);
  await expect(page.getByText('2-step sign-in needed for the Console')).toBeVisible();
  await page.getByRole('button', { name: 'Set up 2-step sign-in' }).click();
  secret = (await page.locator('code').first().innerText()).trim();
  expect(secret).toMatch(/^[A-Z2-7]{32}$/);
  await shot(page, '20-mfa-setup', info.project.name);
  await page.getByLabel('6-digit code').fill('000000');
  await page.getByRole('button', { name: 'Turn on' }).click();
  await expect(page.getByText('That code did not work.')).toBeVisible();
  await page.getByLabel('6-digit code').fill(totpNow(secret));
  await page.getByRole('button', { name: 'Turn on' }).click();
  await expect(page.getByText('2-step sign-in is on').first()).toBeVisible();

  await page.goto('/console');
  await expect(page.getByRole('link', { name: 'Kedai Kopi Mesra Sdn Bhd' })).toBeVisible();
  await shot(page, '21-console-today', info.project.name);
});

test('next sign-in asks for the code before anything else', async ({ page }) => {
  await signInAs(page, 'staff@aigen.test', '/console');
  await expect(page).toHaveURL(/\/mfa/);
  await page.getByLabel('Code').fill(totpNow(secret));
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page).toHaveURL(/\/console$/);
});

test('staff switch a module on for one company, edit a plan, see flags and legal', async ({ page }, info) => {
  await signInAs(page, 'staff@aigen.test', '/console/companies');
  await page.getByLabel('Code').fill(totpNow(secret));
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page).toHaveURL(/\/console\/companies/);
  await shot(page, '22-console-companies', info.project.name);
  await page.getByRole('link', { name: 'Kedai Kopi Mesra Sdn Bhd' }).click();
  await page.getByRole('combobox', { name: 'This company: Quotations and invoices' }).selectOption('on');
  await expect(page.getByText('Saved').first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'This company: Quotations and invoices' })).toHaveValue('on');
  await page.getByRole('textbox', { name: 'Staff notes' }).fill('Called Aminah about the beta.');
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.getByText('Called Aminah about the beta.')).toBeVisible();
  await shot(page, '23-console-company', info.project.name);

  await page.goto('/console/plans');
  await expect(page.getByRole('heading', { name: 'Starter' })).toBeVisible();
  await shot(page, '24-console-plans', info.project.name);
  await page.goto('/console/flags');
  await expect(page.getByText('New sign-ups')).toBeVisible();
  await page.goto('/console/legal');
  await expect(page.getByText('Company details missing')).toBeVisible();
  await shot(page, '25-console-legal', info.project.name);

  // The company's Owner now sees invoicing among the plan's modules, and the change in the activity log.
  await page.context().clearCookies();
  await signInAs(page, 'aminah@demo.aigen.test', '/settings/plan');
  await expect(page.getByText('Quotations and invoices')).toBeVisible();
  await page.goto('/team?tab=activity');
  await expect(page.getByText('switched Quotations and invoices On')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'AIGen staff' }).first()).toBeVisible();
});
