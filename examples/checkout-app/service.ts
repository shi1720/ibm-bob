import express from 'express';
import { PGlite } from '@electric-sql/pglite';
import { z } from 'zod';
import { loadSql } from './files';
import { oldQueries, newQueries } from './queries';
export type AppVersion = 'old' | 'new';
export type SchemaVersion = 'baseline' | 'deployed' | 'candidate';
const baseOrder = z
  .object({
    id: z.number().int().min(1).max(2_147_483_647),
    customer: z.string().trim().min(1).max(120),
    total_cents: z.number().int().min(0).max(2_147_483_647),
  })
  .strict();
const newOrder = baseOrder.extend({ status: z.enum(['pending', 'paid']) });

export async function createCheckoutService(
  version: AppVersion = 'new',
  schema: SchemaVersion = 'deployed',
) {
  const db = new PGlite();
  try {
    await db.waitReady;
    const sql = await loadSql(schema === 'candidate');
    await db.exec(sql.seed);
    if (schema !== 'baseline') await db.exec(sql.up);
    const queries = version === 'old' ? oldQueries : newQueries;
    const app = express();
    app.disable('x-powered-by');
    app.use(express.json({ limit: '8kb' }));
    app.get('/health', (_req, res) =>
      res.json({
        status: 'ok',
        version,
        schema,
        persistence: 'disposable in-memory synthetic sample',
      }),
    );
    app.get('/orders', async (_req, res) => {
      const result = await db.query(queries.read);
      res.json({ orders: result.rows, version });
    });
    app.post('/orders', async (req, res) => {
      const parsed = (version === 'old' ? baseOrder : newOrder).safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({
            error:
              'Invalid order. Supply a positive integer id, customer, nonnegative total_cents, and for the new version a pending/paid status.',
          });
        return;
      }
      const order = parsed.data;
      const values = [
        order.id,
        order.customer,
        order.total_cents,
        ...('status' in order ? [order.status] : []),
      ];
      try {
        // Real HTTP writes always use driver parameters; never string concatenation.
        const result = await db.query(queries.write, values);
        res.status(201).json({ order: result.rows[0] });
      } catch (error) {
        if ((error as { code?: string }).code === '23505') {
          res.status(409).json({ error: 'An order with this id already exists.' });
          return;
        }
        throw error;
      }
    });
    app.use(
      (
        error: { status?: number },
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        if (error.status === 400 || error.status === 413) {
          res.status(error.status).json({ error: 'Invalid or oversized JSON body.' });
          return;
        }
        // This sample deliberately allows incompatible app/schema combinations.
        res
          .status(500)
          .json({
            error:
              'The application query is incompatible with this schema. Inspect the release contract.',
          });
      },
    );
    return { app, db, close: () => db.close() };
  } catch (error) {
    await db.close();
    throw error;
  }
}
