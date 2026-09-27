import { describe, expect, it } from 'vitest';
import {
  createCheckoutService,
  type AppVersion,
  type SchemaVersion,
} from '../examples/checkout-app/service';
import { buildContract } from '../examples/checkout-app/build-contract';
import {
  oldQueries,
  newQueries,
  fixtureWrites,
  orderInvariant,
} from '../examples/checkout-app/queries';
import { loadSql } from '../examples/checkout-app/files';
import { rehearse } from '../src/engine/rehearse';

async function withService(
  version: AppVersion,
  schema: SchemaVersion,
  test: (base: string) => Promise<void>,
) {
  const service = await createCheckoutService(version, schema);
  const server = service.app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    await test(base);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await service.close();
  }
}
const post = (base: string, body: unknown) =>
  fetch(`${base}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
describe('source-backed checkout application', () => {
  it('serves old application writes on both baseline and migrated schemas', async () => {
    for (const schema of ['baseline', 'deployed'] as const) {
      await withService('old', schema, async (base) => {
        const [id, customer, total_cents] = fixtureWrites.old;
        const inserted = await post(base, { id, customer, total_cents });
        expect(inserted.status).toBe(201);
        expect((await inserted.json()).order.customer).toBe(customer);
        const result = await (await fetch(`${base}/orders`)).json();
        expect(result.orders).toHaveLength(4);
        expect(result.orders.at(-1)).toEqual({ id, customer, total_cents });
      });
    }
  });
  it('serves the new contract, validates input, and parameterizes customer strings', async () => {
    await withService('new', 'candidate', async (base) => {
      const customer = "Synthetic O'Brien'); DROP TABLE orders; --";
      const result = await post(base, { id: 206, customer, total_cents: 3900, status: 'paid' });
      expect(result.status).toBe(201);
      expect((await result.json()).order).toEqual({
        id: 206,
        customer,
        total_cents: 3900,
        status: 'paid',
      });
      expect(
        (await post(base, { id: 206, customer, total_cents: 3900, status: 'paid' })).status,
      ).toBe(409);
      expect(
        (await post(base, { id: 207, customer, total_cents: -1, status: 'paid' })).status,
      ).toBe(400);
      expect(
        (await post(base, { id: 207, customer, total_cents: 1, status: 'invented' })).status,
      ).toBe(400);
      expect((await (await fetch(`${base}/orders`)).json()).orders).toHaveLength(4);
    });
  });
  it('makes an incompatible application/schema combination fail visibly', async () => {
    await withService('new', 'baseline', async (base) => {
      const result = await fetch(`${base}/orders`);
      expect(result.status).toBe(500);
      expect((await result.json()).error).toContain('incompatible');
    });
  });
  it('builds the rehearsal from actual service queries and checked-in SQL files', async () => {
    const contract = await buildContract();
    const sql = await loadSql();
    expect(contract.seedSql).toBe(sql.seed.trim());
    expect(contract.upSql).toBe(sql.up.trim());
    expect(contract.downSql).toBe(sql.down.trim());
    expect(contract.oldReadSql).toBe(oldQueries.read);
    expect(contract.newReadSql).toBe(newQueries.read);
    expect(contract.oldWriteSql).toContain(`AS ${oldQueries.write}`);
    expect(contract.newWriteSql).toContain(`AS ${newQueries.write}`);
    expect(contract.invariantSql).toBe(orderInvariant);
    expect(contract.oldWriteSql).toContain("Studio''s");
  });
  it('blocks the actual snapshot rollback and passes the candidate SQL files without weakened coverage', async () => {
    const unsafe = await buildContract();
    const candidate = await buildContract(true);
    for (const field of [
      'seedSql',
      'oldReadSql',
      'newReadSql',
      'oldWriteSql',
      'newWriteSql',
      'invariantSql',
    ] as const)
      expect(candidate[field]).toBe(unsafe[field]);
    const broken = await rehearse(unsafe);
    expect(broken.status).toBe('blocked');
    expect(broken.checks.find((check) => check.id === 'forward')?.status).toBe('passed');
    const missing = broken.checks.find((check) => check.id === 'preservation');
    expect(missing?.status).toBe('failed');
    expect(missing?.before).toHaveLength(4);
    expect(missing?.after).toHaveLength(3);
    const repaired = await rehearse(candidate);
    expect(repaired.status).toBe('passed');
    expect(repaired.checks.find((check) => check.id === 'preservation')?.after).toHaveLength(4);
  }, 30_000);
});
