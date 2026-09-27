import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadSql } from './files';
import { oldQueries, newQueries, fixtureWrites, orderInvariant } from './queries';
import { validateContract } from '../../src/engine/validate';

function sqlLiteral(value: string | number): string {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value))
      throw new Error('Synthetic numeric parameters must be safe integers');
    return String(value);
  }
  // E-strings preserve both quotes and backslashes regardless of connection settings.
  return "E'" + value.replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
}
/** Keep the actual parameterized query intact; bind only reviewed synthetic fixtures. */
export function fixtureSql(
  query: string,
  parameters: readonly (string | number)[],
  statement: 'old' | 'new',
) {
  const name = `undoproof_fixture_${statement}`;
  return `PREPARE ${name} AS ${query}\nEXECUTE ${name} (${parameters.map(sqlLiteral).join(', ')});\nDEALLOCATE ${name};`;
}
export async function buildContract(candidate = false) {
  const [sql, patch] = await Promise.all([loadSql(candidate), loadSql(true)]);
  return validateContract({
    id: 'checkout-service-release',
    name: 'Checkout service: keep the paid order',
    migrationName: '001_add_order_payment_status',
    description:
      'Generated from the runnable checkout service queries and its actual migration files. A customer order arrives after deployment; a snapshot-based rollback silently removes it.',
    seedSql: sql.seed,
    upSql: sql.up,
    downSql: sql.down,
    oldReadSql: oldQueries.read,
    newReadSql: newQueries.read,
    oldWriteSql: fixtureSql(oldQueries.write, fixtureWrites.old, 'old'),
    newWriteSql: fixtureSql(newQueries.write, fixtureWrites.new, 'new'),
    invariantSql: orderInvariant,
    tags: ['Runnable sample', 'PostgreSQL', 'Checkout', 'Synthetic data'],
    ...(candidate
      ? {}
      : {
          repair: {
            summary:
              'Candidate SQL files retain the additive status column when reverting application code; existing orders and post-deployment orders remain. This is a reviewed sample patch, not a generated live repair.',
            upSql: patch.up,
            downSql: patch.down,
          },
        }),
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const args = process.argv.slice(2);
    if (args.some((arg) => arg !== '--candidate' && !arg.startsWith('--out=')))
      throw new Error(
        'Usage: tsx examples/checkout-app/build-contract.ts [--candidate] [--out=path.json]',
      );
    const candidate = args.includes('--candidate');
    const file = resolve(
      args.find((arg) => arg.startsWith('--out='))?.slice(6) ||
        `examples/checkout-app/generated/${candidate ? 'candidate' : 'unsafe'}.json`,
    );
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(await buildContract(candidate), null, 2) + '\n');
    console.log(
      `Generated ${file} from checkout-app/queries.ts and ${candidate ? 'candidate' : 'original'} SQL files.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
