/** Real production smoke test; keeps the complete URL path for GitHub Pages hosting. */
import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const url = process.env.PUBLIC_DEMO_URL || 'https://shi1720.github.io/ibm-bob/';
const output = process.env.PUBLIC_SMOKE_OUTPUT || 'submission/media';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [],
  failedAssets = [],
  assets = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('requestfailed', (request) => {
  if (!request.url().includes('/api/'))
    failedAssets.push({ url: request.url(), error: request.failure()?.errorText });
});
page.on('response', (response) => {
  if (/\.(wasm|data)(?:\?|$)|\/assets\/worker-/.test(response.url()))
    assets.push({ url: response.url(), status: response.status() });
});
let result;
try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: 'Run rehearsal' }).click();
  await page.getByText('Stop. Your rollback breaks.').waitFor({ timeout: 35000 });
  const failedCheck = page.locator('.check-row').filter({ hasText: 'Data preservation' });
  if (!(await failedCheck.innerText()).includes('Failed'))
    throw new Error('Expected data preservation failure was absent.');
  await failedCheck.click();
  const dialog = page.getByRole('dialog');
  if (!(await dialog.innerText()).includes('104'))
    throw new Error('Actual lost order 104 is absent from evidence.');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Review repair' }).click();
  await page.getByRole('button', { name: 'Apply & rehearse' }).click();
  await page.getByText('Safe within this contract.').waitFor({ timeout: 35000 });
  if (await page.locator('.check-row .status.failed').count())
    throw new Error('Repaired contract retains failed checks.');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export evidence' }).click();
  const download = await downloadPromise;
  const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
  if (
    exported.report.status !== 'passed' ||
    exported.report.checks.some((check) => check.status !== 'passed')
  )
    throw new Error('Exported evidence does not match passing screen result.');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: output + '/public-demo.png', fullPage: true });
  if (errors.length || failedAssets.length || assets.some((asset) => asset.status !== 200))
    throw new Error('Production assets or browser execution reported errors.');
  if (
    !assets.some((asset) => asset.url.endsWith('.wasm')) ||
    !assets.some((asset) => asset.url.endsWith('.data'))
  )
    throw new Error('Expected deployed PostgreSQL WASM/data assets were not observed.');
  result = {
    url,
    verifiedAt: new Date().toISOString(),
    status: 'passed',
    flow: [
      'unsafe contract blocked',
      'missing order 104 inspected',
      'repair reviewed and applied',
      'same checks passed',
      'JSON export matched',
    ],
    checkCount: exported.report.checks.length,
    contractHash: exported.report.contractHash,
    engine: exported.report.engine,
    durationMs: exported.report.durationMs,
    assets,
    errors,
    failedAssets,
  };
  await writeFile(output + '/public-smoke-result.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error);
  await page
    .screenshot({ path: output + '/public-smoke-failure.png', fullPage: true })
    .catch(() => {});
  console.error(JSON.stringify({ errors, failedAssets, assets }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
