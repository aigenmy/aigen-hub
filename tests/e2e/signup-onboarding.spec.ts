// Sign-up → legal acceptance → company → invite → accept the invitation as the colleague (spec §13.5, first line).
import { expect, shot, test, unique } from './helpers';

test.describe('new company', () => {
  test.skip(({ isMobile }) => isMobile, 'full journey runs on desktop; the phone project checks layouts');

  test('sign up, accept the documents, create a company, invite a colleague who joins', async ({ page, browser, errors }, info) => {
    const owner = `${unique('owner')}@e2e.aigen.test`;
    const colleague = `${unique('agent')}@e2e.aigen.test`;
    const password = `pw-${unique('x')}`;

    await page.goto('/signup');
    await shot(page, '01-signup', info.project.name);
    await page.getByLabel('Your name').fill('Nurul Huda');
    await page.getByLabel('Work email').fill(owner);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();

    // Legal gate before anything else.
    await expect(page).toHaveURL(/\/accept/);
    await expect(page.getByRole('link', { name: 'Terms of Service' })).toBeVisible();
    await shot(page, '02-accept', info.project.name);
    await expect(page.getByRole('button', { name: 'Accept and continue' })).toBeDisabled();
    await page.getByLabel('I have read and accept the documents above.').check();
    await page.getByRole('button', { name: 'Accept and continue' }).click();

    // Onboarding: company.
    await expect(page).toHaveURL(/\/onboarding/);
    await shot(page, '03-onboarding-company', info.project.name);
    await page.getByLabel('Company name').fill('Bengkel Ah Seng');
    await page.getByLabel('Type of business').selectOption('services');
    await page.getByRole('button', { name: 'Create company' }).click();

    // Onboarding: invite (the red warning must be ticked first).
    await expect(page).toHaveURL(/step=team/);
    await page.getByLabel('Email').fill(colleague);
    await expect(page.getByRole('button', { name: 'Create invitation' })).toBeDisabled();
    await page.getByLabel('I understand').check();
    await shot(page, '04-onboarding-invite', info.project.name);
    await page.getByRole('button', { name: 'Create invitation' }).click();
    const linkBox = page.getByRole('textbox', { name: 'Invitation ready' });
    await expect(linkBox).toBeVisible();
    const link = await linkBox.inputValue();
    expect(link).toMatch(/\/invite\/[A-Za-z0-9_-]{40,}$/);
    await page.getByRole('link', { name: 'Skip for now' }).click();
    await expect(page.getByRole('heading', { name: 'Bengkel Ah Seng is ready' })).toBeVisible();
    await page.getByRole('button', { name: 'Go to Home' }).click();
    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByText('Bengkel Ah Seng · Free plan')).toBeVisible();
    await expect(page.getByText('1 of 2 seats')).toBeVisible();

    // The colleague opens the link in a fresh browser, creates an account, accepts and lands in the company.
    const other = await browser.newContext();
    const p2 = await other.newPage();
    await p2.goto(link);
    await expect(p2.getByText('Sign in or create an account with the email address that received this invitation.')).toBeVisible();
    await p2.getByRole('link', { name: 'Create an account' }).click();
    await p2.getByLabel('Your name').fill('Kumar Selvam');
    await p2.getByLabel('Work email').fill(colleague);
    await p2.getByLabel('Password').fill(password);
    await p2.getByRole('button', { name: 'Create account' }).click();
    await p2.getByLabel('I have read and accept the documents above.').check();
    await p2.getByRole('button', { name: 'Accept and continue' }).click();
    await expect(p2.getByRole('heading', { name: 'Join Bengkel Ah Seng' })).toBeVisible();
    await p2.getByRole('button', { name: 'Accept and join' }).click();
    await expect(p2).toHaveURL(/\/home/);
    await expect(p2.getByText('Bengkel Ah Seng · Free plan')).toBeVisible();
    await expect(p2.getByText('Agent', { exact: true })).toBeVisible();
    // The same link cannot be used again.
    await p2.goto(link);
    await expect(p2.getByText('This invitation has already been used.')).toBeVisible();
    await other.close();

    // Owner sees both members and the activity in plain words.
    await page.goto('/team');
    await expect(page.getByText('Kumar Selvam')).toBeVisible();
    await page.getByRole('link', { name: 'Activity' }).click();
    await expect(page.getByText(`invited ${colleague} as Agent`)).toBeVisible();
    await expect(page.getByText('added Kumar Selvam as Agent')).toBeVisible();
    await shot(page, '05-team-activity', info.project.name);

    // Password sign-in works after signing out.
    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByLabel('Email').fill(owner);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/home/);
    expect(errors).toEqual([]);
  });

  test('a wrong password is explained, not crashed', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nobody@e2e.aigen.test');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('The email or password is not right.')).toBeVisible();
  });
});
