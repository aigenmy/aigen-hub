import { expect, test as base, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { totpAt } from '../../apps/web/lib/auth/totp';

export const unique = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Every test fails if the page logs an error or throws (spec §13: no console errors). */
export const test = base.extend<{ errors: string[] }>({
  errors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Download the React DevTools|favicon/.test(m.text())) errors.push(`console: ${m.text()}`);
    });
    await use(errors);
    expect(errors, errors.join('\n')).toEqual([]);
  },
});
export { expect };

/** One-click sign-in with a seeded local test account (local mode only). */
export async function signInAs(page: Page, email: string, next = '/home') {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByRole('button', { name: new RegExp(email.replace(/[.@]/g, '\\$&')) }).click();
}

/** A code the local 2-step sign-in accepts, from the secret shown during setup. */
export const totpNow = (secret: string) => totpAt(secret, Date.now());

const shotDir = path.resolve(__dirname, '..', '..', '.local', 'screenshots');
mkdirSync(shotDir, { recursive: true });

/** Full-page screenshot for Michael, named by project (desktop / phone). */
export async function shot(page: Page, name: string, project: string) {
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(shotDir, `${project}-${name}.png`), fullPage: true });
}
