import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { contracts } from '../../examples/contracts';

test('real PostgreSQL blocks data loss, exposes rows, repairs and exports evidence', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Run rehearsal' }).click();
  await expect(page.getByText('Stop. Your rollback breaks.')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.check-row')).toHaveCount(10);
  await expect(page.locator('.check-row').filter({ hasText: 'Data preservation' })).toContainText(
    'Failed',
  );
  await page.screenshot({ path: 'submission/media/rehearsal-blocked.png', fullPage: true });
  await page.locator('.check-row').filter({ hasText: 'Data preservation' }).click();
  await expect(page.getByRole('dialog')).toContainText('Before rollback');
  await expect(page.getByRole('dialog')).toContainText('After rollback');
  const dataBlocks = page.getByRole('dialog').locator('.row-comparison .data-table-wrap');
  expect(await dataBlocks.nth(0).innerText()).not.toBe(await dataBlocks.nth(1).innerText());
  await page.screenshot({ path: 'submission/media/data-loss-evidence.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Review repair' }).click();
  await expect(page.getByRole('dialog')).toContainText('PROPOSED REPAIR');
  await page.getByRole('button', { name: 'Apply & rehearse' }).click();
  await expect(page.getByText('Safe within this contract.')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.check-row .status.failed')).toHaveCount(0);
  await page.screenshot({ path: 'submission/media/rehearsal-passed.png', fullPage: true });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export evidence' }).click();
  expect((await download).suggestedFilename()).toMatch(/^undoproof-.*\.json$/);
  await page.getByRole('button', { name: 'Run history' }).click();
  await expect(page.locator('.history-row')).toHaveCount(2);
  await page.reload();
  await page.getByRole('button', { name: 'Run history' }).click();
  await expect(page.locator('.history-row')).toHaveCount(2);
  await page
    .getByRole('button', { name: /Delete run/ })
    .first()
    .click();
  await expect(page.locator('.history-row')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('custom contract imports, invalid input is rejected, and SQL remains editable', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type=file]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"id":"bad"}'),
  });
  await expect(page.getByRole('alert')).toContainText('Invalid release contract');
  const contract = { ...contracts[2], name: 'Imported team release' };
  await page.locator('input[type=file]').setInputFiles({
    name: 'release.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(contract)),
  });
  await expect(page.getByRole('heading', { name: 'Imported team release' })).toBeVisible();
  await page.getByRole('button', { name: 'Release contract', exact: true }).click();
  await page.getByRole('tab', { name: '08 / Roll back migration' }).click();
  await page.getByRole('textbox', { name: 'downSql' }).fill('SELECT 1;');
  await expect(page.getByRole('textbox', { name: 'downSql' })).toHaveValue('SELECT 1;');
  const d = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export contract' }).click();
  expect((await d).suggestedFilename()).toMatch(/\.json$/);
});

test('mobile layout and optional static-demo accounts remain usable', async ({ page }) => {
  if (!process.env.E2E_WITH_AUTH)
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({ status: 404, contentType: 'text/html', body: 'Not found' }),
    );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'submission/media/mobile-workspace.png', fullPage: true });
  await page.getByRole('button', { name: 'Release contract', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run history' }).click();
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  if (!process.env.E2E_WITH_AUTH)
    await expect(page.getByText('You’re in the browser demo.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('private workspace deletion requires the password, removes private runs, and preserves guest history', async ({
  page,
}) => {
  test.skip(!process.env.E2E_WITH_AUTH, 'Requires included account server');
  const email = `ui-${Date.now()}@example.test`,
    password = 'test-password-938471';
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // A genuine guest rehearsal must survive account operations on the same device.
  await page.getByRole('button', { name: 'Run rehearsal' }).click();
  await expect(page.getByText('Stop. Your rollback breaks.')).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Sign in to a workspace' }).click();
  await page.getByRole('button', { name: 'New here? Create a workspace' }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Browser Test');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await expect(page.getByText('ACCOUNT CONNECTED')).toBeVisible();
  await page.getByRole('button', { name: 'Run rehearsal' }).click();
  await expect(page.getByText('Stop. Your rollback breaks.')).toBeVisible({ timeout: 30000 });
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('undoproof.runs.v1') || '[]').length),
  ).toBe(1);
  await page.getByRole('button', { name: 'Run history' }).click();
  await expect(page.locator('.history-row')).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.locator('.history-row')).toHaveCount(1);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Sign in to a workspace' }).click();
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('ACCOUNT CONNECTED')).toBeVisible();
  await expect(page.locator('.history-row')).toHaveCount(2);
  // Use the actual settings UI on mobile; an incorrect password must not delete anything.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Account settings', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('This cannot be undone.');
  await page.getByLabel('Confirm password').fill('incorrect-password');
  await page.getByRole('button', { name: 'Delete account permanently' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Invalid password');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Delete account permanently' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('RUNS LOCALLY')).toBeVisible();
  await expect(page.locator('.history-row')).toHaveCount(1);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('undoproof.runs.v1') || '[]').length),
  ).toBe(1);
  await page.getByRole('button', { name: 'Rehearsal lab', exact: true }).click();
  await expect(page.getByText('A green deploy isn’t enough.')).toBeVisible();
  const me = await page.request.get('/api/auth/me');
  expect((await me.json()).user).toBeNull();
  const runs = await page.request.get('/api/runs');
  expect(runs.status()).toBe(401);
});

test('SQL worker timeout terminates long-running SQL without saving a partial verdict', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const contract = { ...contracts[0], seedSql: contracts[0].seedSql + '\nSELECT pg_sleep(45);' };
  await page.locator('input[type=file]').setInputFiles({
    name: 'long-running.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(contract)),
  });
  await page.getByRole('button', { name: 'Run rehearsal' }).click();
  await expect(page.getByRole('alert')).toContainText('Rehearsal stopped after 30 seconds.', {
    timeout: 35000,
  });
  await expect(page.getByRole('button', { name: 'Run rehearsal' })).toBeEnabled();
  await page.getByRole('button', { name: 'Run history' }).click();
  await expect(page.locator('.history-row')).toHaveCount(0);
});

test('large fixture previews are bounded while exported evidence retains all 10000 rows', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const contract = {
    ...contracts[2],
    seedSql:
      contracts[2].seedSql +
      "\nINSERT INTO orders SELECT i, 'Synthetic bulk order', 100 FROM generate_series(10000,19995) AS i;",
  };
  await page.locator('input[type=file]').setInputFiles({
    name: 'large-fixture.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(contract)),
  });
  await page.getByRole('button', { name: 'Run rehearsal' }).click();
  await expect(page.getByText('Safe within this contract.')).toBeVisible({ timeout: 30000 });
  await page.locator('.check-row').filter({ hasText: 'Data preservation' }).click();
  await expect(page.getByRole('dialog').locator('.preview-notice')).toHaveCount(2);
  await expect(page.getByRole('dialog').locator('.preview-notice').first()).toContainText(
    'Showing first 100 of 10,000 rows',
  );
  await expect(page.getByRole('dialog').locator('.data-table tbody tr')).toHaveCount(200);
  await page.keyboard.press('Escape');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export evidence' }).click();
  const exported = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
  const check = exported.report.checks.find((c: { id: string }) => c.id === 'preservation');
  expect(check.before).toHaveLength(10000);
  expect(check.after).toHaveLength(10000);
});

test('corrupt persisted guest history is ignored without crashing the workspace', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'undoproof.runs.v1',
      JSON.stringify([
        { id: 'corrupt', contract: { id: 'old' }, report: { checks: { invalid: true } } },
        null,
        { report: { checks: [] }, contract: { id: 'missing-fields' } },
      ]),
    );
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Run history' }).click();
  await expect(page.locator('.history-row')).toHaveCount(0);
  await page.getByRole('button', { name: 'Rehearsal lab', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run rehearsal' })).toBeVisible();
  expect(errors).toEqual([]);
});
