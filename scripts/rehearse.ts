#!/usr/bin/env node
import { fork } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contracts } from '../examples/contracts';
import { validateContract } from '../src/engine/validate';
import { rehearse } from '../src/engine/rehearse';
const args = process.argv.slice(2);
if (args.includes('--worker')) {
  process.on('message', async (value) => {
    try {
      process.send?.({ report: await rehearse(validateContract(value)) });
    } catch (e) {
      process.send?.({ error: e instanceof Error ? e.message : String(e) });
    }
  });
} else {
  try {
    const file = args.find((a) => !a.startsWith('--'));
    if (!file || args.includes('--help')) {
      console.log(
        'UndoProof: npm run rehearse -- <contract.json|demo:snapshot|demo:rename|demo:safe> [--repair] [--out=report.json]\nExit: 0 passed, 1 blocked, 2 invalid/timeout. Executes SQL only in disposable embedded PostgreSQL.',
      );
      process.exit(args.includes('--help') ? 0 : 2);
    }
    const names: Record<string, number> = { 'demo:snapshot': 0, 'demo:rename': 1, 'demo:safe': 2 };
    let contract = validateContract(
      file in names ? contracts[names[file]] : JSON.parse(await readFile(resolve(file), 'utf8')),
    );
    if (args.includes('--repair')) {
      if (!contract.repair) throw new Error('This contract has no candidate repair.');
      const { summary, ...patch } = contract.repair;
      contract = { ...contract, ...patch, invariantSql: contract.invariantSql };
    }
    const child = fork(fileURLToPath(import.meta.url), ['--worker'], {
      execArgv: ['--import', 'tsx', '--max-old-space-size=512'],
      stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
    });
    let receivedResult = false;
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      console.error('Rehearsal exceeded 30 seconds. No passing evidence produced.');
      process.exitCode = 2;
    }, 30000);
    child.on('message', async (message: any) => {
      receivedResult = true;
      clearTimeout(timer);
      child.kill();
      if (message.error) {
        console.error(message.error);
        process.exitCode = 2;
        return;
      }
      const report = message.report;
      const out = args.find((a) => a.startsWith('--out='))?.slice(6);
      if (out) {
        try {
          await writeFile(resolve(out), JSON.stringify(report, null, 2) + '\n');
        } catch (e) {
          console.error('Could not save evidence: ' + (e instanceof Error ? e.message : String(e)));
          process.exitCode = 2;
          return;
        }
      }
      console.log(
        `${report.status.toUpperCase()} | ${report.contractName} | ${report.durationMs} ms`,
      );
      for (const c of report.checks)
        console.log(
          `${c.status === 'passed' ? 'PASS' : c.status === 'failed' ? 'FAIL' : 'SKIP'} ${c.name}: ${c.detail}${c.error ? ' [' + c.error + ']' : ''}`,
        );
      console.log(
        `Contract SHA-256: ${report.contractHash}\nScope: supplied SQL contracts and synthetic fixtures; not production concurrency or capacity.`,
      );
      process.exitCode = report.status === 'passed' ? 0 : report.status === 'blocked' ? 1 : 2;
    });
    child.on('error', (e) => {
      clearTimeout(timer);
      console.error(e.message);
      process.exitCode = 2;
    });
    child.on('exit', () => {
      clearTimeout(timer);
      if (!receivedResult) {
        console.error('Rehearsal worker exited without a report.');
        process.exitCode = 2;
      }
    });
    child.send(contract);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 2;
  }
}
