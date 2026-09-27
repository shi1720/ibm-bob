import { test, expect } from '@playwright/test';

test('Firebase private account lifecycle persists evidence without leaking into guest history', async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_FIREBASE,
    'Requires an explicitly selected deployed Firebase test target',
  );
  test.setTimeout(120000);
  const email = `undoproof-test-${Date.now()}@example.com`;
  const password = 'test-only-long-password-349162';
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Run rehearsal' }).click();
  await expect(page.getByText('Stop. Your rollback breaks.')).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Sign in to a workspace' }).click();
  await page.getByRole('button', { name: 'New here? Create a workspace' }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Firebase Test');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await expect(page.getByText('ACCOUNT CONNECTED')).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Run rehearsal' }).click();
  await expect(page.getByText('Stop. Your rollback breaks.')).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Run history' }).click();
  await expect(page.locator('.history-row')).toHaveCount(2, { timeout: 20000 });
  await page.reload();
  await expect(page.getByText('ACCOUNT CONNECTED')).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Run history' }).click();
  await expect(page.locator('.history-row')).toHaveCount(2, { timeout: 20000 });
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('undoproof.runs.v1') || '[]').length),
  ).toBe(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.locator('.history-row')).toHaveCount(1);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Sign in to a workspace' }).click();
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('dialog')).toContainText('Reset your password.');
  await page.getByRole('button', { name: 'Back to sign in' }).click();
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('ACCOUNT CONNECTED')).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Account settings', exact: true }).click();
  await page.getByLabel('Confirm password').fill('incorrect-password');
  await page.getByRole('button', { name: 'Delete account permanently' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('incorrect', {
    timeout: 20000,
  });
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Delete account permanently' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20000 });
  await expect(page.getByText('RUNS LOCALLY')).toBeVisible();
  await expect(page.locator('.history-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Sign in to a workspace' }).click();
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('incorrect', {
    timeout: 20000,
  });
  expect(errors).toEqual([]);
});

test('deployed Firestore rules isolate owners and block writes after account deletion starts', async ({
  request,
}) => {
  test.skip(
    !process.env.E2E_FIREBASE,
    'Requires an explicitly selected deployed Firebase test target',
  );
  const { readFile } = await import('node:fs/promises');
  const local = await readFile('.env.production.local', 'utf8').catch(() => '');
  const setting = (name: string) =>
    process.env[name] ||
    local
      .match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1]
      ?.trim()
      .replace(/^['"]|['"]$/g, '');
  const apiKey = setting('VITE_FIREBASE_API_KEY');
  const project = setting('VITE_FIREBASE_PROJECT_ID');
  expect(apiKey, 'Firebase public web API key required for live ownership checks').toBeTruthy();
  expect(project).toBeTruthy();
  const identity = 'https://identitytoolkit.googleapis.com/v1/accounts:';
  const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
  const accounts: { idToken: string; localId: string }[] = [];
  try {
    for (const suffix of ['a', 'b']) {
      const response = await request.post(`${identity}signUp?key=${apiKey}`, {
        data: {
          email: `undoproof-rules-${Date.now()}-${suffix}@example.com`,
          password: 'test-only-rules-password-842715',
          returnSecureToken: true,
        },
      });
      expect(response.ok(), 'Synthetic account creation must succeed').toBeTruthy();
      accounts.push(await response.json());
    }
    const [alice, bob] = accounts;
    const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
    const path = `${base}/users/${alice.localId}/runs/rules-test`;
    const fields = {
      payload: { stringValue: '{"test":"synthetic ownership boundary"}' },
      startedAt: { stringValue: new Date().toISOString() },
    };
    expect(
      (await request.patch(path, { headers: headers(alice.idToken), data: { fields } })).status(),
    ).toBe(200);
    expect((await request.get(path, { headers: headers(alice.idToken) })).status()).toBe(200);
    expect((await request.get(path, { headers: headers(bob.idToken) })).status()).toBe(403);
    expect((await request.get(path)).status()).toBe(403);
    expect(
      (await request.patch(path, { headers: headers(bob.idToken), data: { fields } })).status(),
    ).toBe(403);
    expect(
      (
        await request.patch(path, {
          headers: headers(alice.idToken),
          data: { fields: { ...fields, unexpected: { stringValue: 'blocked' } } },
        })
      ).status(),
    ).toBe(403);
    // A tombstone permanently blocks new evidence from this account, including older tab tokens.
    expect(
      (
        await request.patch(`${base}/users/${alice.localId}`, {
          headers: headers(alice.idToken),
          data: { fields: { deleting: { booleanValue: true } } },
        })
      ).status(),
    ).toBe(200);
    expect(
      (await request.patch(path, { headers: headers(alice.idToken), data: { fields } })).status(),
    ).toBe(403);
    expect((await request.delete(path, { headers: headers(alice.idToken) })).status()).toBe(200);
  } finally {
    for (const account of accounts) {
      await request.delete(`${base}/users/${account.localId}/runs/rules-test`, {
        headers: { Authorization: `Bearer ${account.idToken}` },
      });
      const removed = await request.post(`${identity}delete?key=${apiKey}`, {
        data: { idToken: account.idToken },
      });
      expect(removed.ok(), 'Synthetic Firebase account cleanup must succeed').toBeTruthy();
    }
  }
});
