import type { ReleaseContract } from '../src/engine/types';
const seedSql = `CREATE TABLE orders (id INTEGER PRIMARY KEY, customer TEXT NOT NULL, total_cents INTEGER NOT NULL CHECK(total_cents >= 0));
INSERT INTO orders VALUES (101, 'Northstar Studio', 24900), (102, 'Juniper Labs', 8900), (103, 'Atlas Works', 15900);`;
const common = {
 seedSql,
 oldReadSql:'SELECT id, customer, total_cents FROM orders ORDER BY id;',
 oldWriteSql:"INSERT INTO orders (id, customer, total_cents) VALUES (105, 'Legacy checkout', 4200);",
 invariantSql:'SELECT id, customer, total_cents FROM orders ORDER BY id;',
 tags:['PostgreSQL','Checkout','Synthetic data'],
};
export const contracts: ReleaseContract[] = [
 {
 ...common,id:'checkout-snapshot',name:'The disappearing order',migrationName:'20260927_004_add_order_status',
 description:'A checkout release adds order status. Forward tests pass. The rollback restores a pre-release snapshot — silently erasing orders placed after deployment.',
 upSql:`CREATE TABLE orders_backup AS TABLE orders;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';`,
 downSql:`DROP TABLE orders;
ALTER TABLE orders_backup RENAME TO orders;`,
 newReadSql:'SELECT id, customer, total_cents, status FROM orders ORDER BY id;',
 newWriteSql:"INSERT INTO orders (id, customer, total_cents, status) VALUES (104, 'New customer order', 32900, 'paid');",
 repair:{summary:'Keep the additive status column when reverting the application. Old code ignores it, and its DEFAULT supports old writers. Remove the snapshot restoration so post-deployment orders survive. Clean up schema later in a separately rehearsed release.',
 upSql:"ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';",
 downSql:'-- Application rollback: retain the compatible expanded schema.\nSELECT 1;'},
 },
 {
 ...common,id:'checkout-rename',name:'The broken rolling deploy',migrationName:'20260927_005_rename_customer',
 description:'Renaming customer to customer_name works for the new application, but old instances still query and write customer during a rolling deployment.',
 upSql:'ALTER TABLE orders RENAME COLUMN customer TO customer_name;',
 downSql:'ALTER TABLE orders RENAME COLUMN customer_name TO customer;',
 newReadSql:'SELECT id, customer_name, total_cents FROM orders ORDER BY id;',
 newWriteSql:"INSERT INTO orders (id, customer_name, total_cents) VALUES (104, 'New customer order', 32900);",
 invariantSql:"SELECT id, to_jsonb(orders)->>'total_cents' AS total_cents, COALESCE(to_jsonb(orders)->>'customer', to_jsonb(orders)->>'customer_name') AS customer FROM orders ORDER BY id;",
 repair:{summary:'Expand the schema with a generated alias. Keep customer as the write contract during this release, expose customer_name for new readers, and retain both on application rollback. A future write-contract cutover needs its own rehearsal.',
 upSql:'ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT GENERATED ALWAYS AS (customer) STORED;',
 downSql:'-- Retain generated alias while reverting the application.\nSELECT 1;',
 newWriteSql:"INSERT INTO orders (id, customer, total_cents) VALUES (104, 'New customer order', 32900);"},
 },
 {
 ...common,id:'checkout-expand',name:'The safe expansion',migrationName:'20260927_006_add_fulfillment',
 description:'An additive column with a default supports both versions. The application rollback keeps the expanded schema and preserves new orders.',
 upSql:"ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment TEXT NOT NULL DEFAULT 'unassigned';",
 downSql:'-- Roll back the application while retaining additive schema.\nSELECT 1;',
 newReadSql:'SELECT id, customer, total_cents, fulfillment FROM orders ORDER BY id;',
 newWriteSql:"INSERT INTO orders (id, customer, total_cents, fulfillment) VALUES (104, 'New customer order', 32900, 'queued');",
 },
];
export default contracts;
