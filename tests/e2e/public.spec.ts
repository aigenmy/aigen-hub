// Pages anyone can open: sign-in, legal documents, language switch, health check.
import { expect, shot, test } from './helpers';

test('sign-in page and legal pages are reachable without an account', async ({ page }, info) => {
  await page.goto('/home');
  await expect(page).toHaveURL(/\/login\?next=%2Fhome/);
  await shot(page, '00-login', info.project.name);
  await page.goto('/legal/terms');
  await expect(page.getByRole('heading', { name: 'Terms of Service', level: 1 })).toBeVisible();
  await shot(page, '06-legal-terms', info.project.name);
  await page.goto('/legal/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy Notice', level: 1 })).toBeVisible();
});

test('the language switch changes the sign-in page', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('combobox', { name: 'Language' }).selectOption('ms');
  await expect(page.getByRole('heading', { name: 'Log masuk ke AIGen Hub' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Bahasa' }).selectOption('zh');
  await expect(page.getByRole('heading', { name: '登录 AIGen Hub' })).toBeVisible();
  await page.getByRole('combobox', { name: '语言' }).selectOption('en');
  await expect(page.getByRole('heading', { name: 'Sign in to AIGen Hub' })).toBeVisible();
});

test('health check answers', async ({ request }) => {
  const r = await request.get('/api/health');
  expect(r.status()).toBe(200);
  expect(await r.json()).toEqual({ ok: true });
});
