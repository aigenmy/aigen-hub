// Roles in the demo company (spec §4.3): what Owner, Admin, Agent and Viewer can see and do on screen.
import { expect, shot, signInAs, test } from './helpers';

test('Owner sees Home, Team, Settings and screenshots them', async ({ page }, info) => {
  await signInAs(page, 'aminah@demo.aigen.test');
  await expect(page.getByText(/Kedai Kopi Mesra Sdn Bhd · Growth plan/)).toBeVisible();
  await shot(page, '10-home-owner', info.project.name);
  await page.goto('/team');
  await expect(page.getByText('Daniel Tan')).toBeVisible();
  await shot(page, '11-team-owner', info.project.name);
  for (const tab of ['profile', 'company', 'security', 'plan', 'legal']) {
    await page.goto(`/settings/${tab}`);
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
    await shot(page, `12-settings-${tab}`, info.project.name);
  }
});

test.describe('desktop only', () => {
  test.skip(({ isMobile }) => isMobile, 'role management runs on desktop');

  test('Admin changes an Agent to Viewer and back, cannot touch the Owner', async ({ page }) => {
    await signInAs(page, 'daniel@demo.aigen.test', '/team');
    const aminahRow = page.getByRole('row', { name: /Aminah Rahman/ });
    await expect(aminahRow.getByRole('combobox')).toHaveCount(0);
    const row = page.getByRole('row', { name: /Siti Aisyah/ });
    await row.getByRole('combobox', { name: 'Change role' }).selectOption('viewer');
    await expect(page.getByText('Role changed')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('row', { name: /Siti Aisyah/ }).getByRole('combobox')).toHaveValue('viewer');
    await page.getByRole('row', { name: /Siti Aisyah/ }).getByRole('combobox').selectOption('agent');
    await expect(page.getByText('Role changed').first()).toBeVisible();
    // Admins may not offer the Admin role to anyone.
    await expect(page.getByRole('row', { name: /Lim Wei Jie/ }).getByRole('option', { name: 'Admin' })).toHaveCount(0);
  });

  test('Suspend asks first, then frees the seat; Restore brings the member back', async ({ page }) => {
    await signInAs(page, 'aminah@demo.aigen.test', '/team');
    await expect(page.getByText('4 of 6 seats used')).toBeVisible();
    await page.getByRole('row', { name: /Lim Wei Jie/ }).getByRole('button', { name: 'Suspend' }).click();
    await expect(page.getByRole('dialog', { name: 'Suspend Lim Wei Jie?' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Suspend' }).click();
    await expect(page.getByText('Member suspended')).toBeVisible();
    await expect(page.getByText('3 of 6 seats used')).toBeVisible();
    await page.getByRole('row', { name: /Lim Wei Jie/ }).getByRole('button', { name: 'Restore' }).click();
    await expect(page.getByText('4 of 6 seats used')).toBeVisible();
  });

  test('Viewer and Agent see the team read-only, without invitations or activity', async ({ page }) => {
    await signInAs(page, 'rajesh@demo.aigen.test', '/team');
    await expect(page.getByText('Daniel Tan')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Invite member' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Activity' })).toHaveCount(0);
    await expect(page.getByText('Only Owners and Admins can invite or change members.')).toBeVisible();
    await page.goto('/settings/company');
    await expect(page.getByLabel('Company name')).toBeDisabled();
  });

  test('a member cannot open the Console', async ({ page }) => {
    await signInAs(page, 'aminah@demo.aigen.test');
    const res = await page.goto('/console');
    expect(res?.status()).toBe(404);
  });
});
