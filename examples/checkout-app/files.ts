import { readFile } from 'node:fs/promises';
export async function loadSql(candidate = false) {
  const read = (file: string) => readFile(new URL(`./sql/${file}`, import.meta.url), 'utf8');
  const [seed, up, down] = await Promise.all([
    read('seed.sql'),
    read(candidate ? 'up.candidate.sql' : 'up.sql'),
    read(candidate ? 'down.candidate.sql' : 'down.sql'),
  ]);
  return { seed, up, down };
}
