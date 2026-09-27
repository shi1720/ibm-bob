/** Records an actual local browser rehearsal. No report or result is mocked. */
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
const out = 'submission/media';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: '.artifacts/recordings', size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
const events = [];
let start;
const mark = (label) => {
  const seconds = Math.round((Date.now() - start) / 100) / 10;
  events.push({ seconds, label });
  console.log(`${seconds}s ${label}`);
};
const at = async (seconds) => {
  const remaining = start + seconds * 1000 - Date.now();
  if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
};
await page.goto(process.env.DEMO_URL || 'http://127.0.0.1:5173', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
start = Date.now();
mark('Product overview: The disappearing order');
await at(8);
await page.getByRole('button', { name: 'Release contract', exact: true }).click();
mark('Executable release contract');
await at(14);
await page.getByRole('tab', { name: '08 / Roll back migration' }).click();
mark('Unsafe DOWN restores a pre-deployment snapshot');
await at(23);
await page.getByRole('tab', { name: '06 / Post-deploy writes' }).click();
mark('New order 104 is created after deployment');
await at(31);
await page.getByRole('button', { name: 'Run rehearsal' }).click();
mark('Run real isolated PostgreSQL checks');
await page.getByText('Stop. Your rollback breaks.').waitFor({ timeout: 30000 });
mark('Blocked result arrives');
await at(39);
await page.locator('.matrix').scrollIntoViewIfNeeded();
mark('Inspect compatibility matrix: rollback executes, preservation fails');
await at(48);
await page.locator('.check-row').filter({ hasText: 'Data preservation' }).click();
mark('Actual row comparison: order 104 disappears');
await page.screenshot({ path: out + '/data-loss-evidence.png' });
await at(64);
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Bob handoff' }).scrollIntoViewIfNeeded();
const handoff = page.waitForEvent('download');
await page.getByRole('button', { name: 'Bob handoff' }).click();
await (await handoff).saveAs(out + '/recorded-bob-handoff.md');
mark('Export exact contract and measured failures to IBM Bob');
await at(73);
await page.getByRole('button', { name: 'Review repair' }).click();
mark('Review non-destructive repair SQL before applying');
await at(86);
await page.getByRole('button', { name: 'Apply & rehearse' }).click();
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
mark('Apply reviewed SQL and rerun the same engine');
await page.getByText('Safe within this contract.').waitFor({ timeout: 30000 });
mark('Repaired contract passes');
await at(96);
await page.locator('.check-row').filter({ hasText: 'Data preservation' }).click();
mark('All four orders survive, including post-deployment write');
await at(108);
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Export evidence' }).scrollIntoViewIfNeeded();
const evidence = page.waitForEvent('download');
await page.getByRole('button', { name: 'Export evidence' }).click();
await (await evidence).saveAs(out + '/recorded-repaired-evidence.json');
mark('Export reproducible JSON evidence packet');
await at(116);
await page.getByRole('button', { name: 'Run history' }).click();
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
mark('History records the blocked and repaired runs');
await at(126);
mark('End of recording');
const video = page.video();
await context.close();
await video.saveAs(out + '/screen-demo.webm');
await browser.close();
await writeFile(out + '/screen-demo-timeline.json', JSON.stringify(events, null, 2) + '\n');
console.log('Saved ' + out + '/screen-demo.webm');

// Trim only initial page-loading footage. The 126-second application flow is uninterrupted.
try {
  const duration = Number(
    execFileSync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        out + '/screen-demo.webm',
      ],
      { encoding: 'utf8' },
    ).trim(),
  );
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-ss',
      String(Math.max(0, duration - 126)),
      '-i',
      out + '/screen-demo.webm',
      '-t',
      '126',
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      out + '/screen-demo.mp4',
    ],
    { stdio: 'ignore' },
  );
  console.log('Saved ' + out + '/screen-demo.mp4 (126 seconds, silent; add your narration).');
} catch (error) {
  console.warn('WebM saved. Install ffmpeg for automatic MP4 encoding:', error.message);
}
