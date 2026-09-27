import { z } from 'zod';
const sql = z
  .string()
  .trim()
  .min(1, 'SQL cannot be empty')
  .max(50000, 'SQL exceeds 50,000 characters');
const text = z.string().trim().min(1).max(500);
export const contractSchema = z
  .object({
    id: text,
    name: text,
    description: z.string().max(4000),
    migrationName: text,
    seedSql: sql,
    upSql: sql,
    downSql: sql,
    oldReadSql: sql,
    newReadSql: sql,
    newWriteSql: sql,
    oldWriteSql: sql,
    invariantSql: sql,
    tags: z.array(z.string().max(60)).max(20),
    repair: z
      .object({
        summary: z.string().max(4000),
        upSql: sql,
        downSql: sql,
        newWriteSql: sql.optional(),
        oldWriteSql: sql.optional(),
        newReadSql: sql.optional(),
        oldReadSql: sql.optional(),
        invariantSql: sql.optional(),
      })
      .optional(),
  })
  .superRefine((contract, context) => {
    if (
      contract.repair?.invariantSql !== undefined &&
      contract.repair.invariantSql !== contract.invariantSql
    ) {
      context.addIssue({
        code: 'custom',
        path: ['repair', 'invariantSql'],
        message:
          'A candidate repair must preserve the original invariant SQL. Fix the migration or application queries without weakening the evidence contract.',
      });
    }
  });
export function validateContract(value: unknown) {
  return contractSchema.parse(value);
}
