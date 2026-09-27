/** The HTTP service and release-contract generator import these same queries. */
export const oldQueries = {
  read: 'SELECT id, customer, total_cents FROM orders ORDER BY id;',
  write:
    'INSERT INTO orders (id, customer, total_cents) VALUES ($1, $2, $3) RETURNING id, customer, total_cents;',
} as const;
export const newQueries = {
  read: 'SELECT id, customer, total_cents, status FROM orders ORDER BY id;',
  write:
    'INSERT INTO orders (id, customer, total_cents, status) VALUES ($1, $2, $3, $4) RETURNING id, customer, total_cents, status;',
} as const;
// This is an explicit business promise, not inferred coverage of the entire service.
// The status column is additive; rollback of app code must retain orders and money.
export const orderInvariant = 'SELECT id, customer, total_cents FROM orders ORDER BY id;';
export const fixtureWrites = {
  old: [205, "Synthetic Studio's legacy checkout", 12900],
  new: [204, 'Synthetic post-deployment customer', 34900, 'paid'],
} as const;
