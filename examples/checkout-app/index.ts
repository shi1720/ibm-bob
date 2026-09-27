import { createCheckoutService, type AppVersion, type SchemaVersion } from './service';
const version = process.env.APP_VERSION ?? 'new';
const schema = process.env.SCHEMA_VERSION ?? 'deployed';
if (!['old', 'new'].includes(version)) throw new Error('APP_VERSION must be old or new');
if (!['baseline', 'deployed', 'candidate'].includes(schema))
  throw new Error('SCHEMA_VERSION must be baseline, deployed, or candidate');
const port = Number(process.env.SAMPLE_PORT ?? 3002);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('SAMPLE_PORT must be a valid port');
const { app, close } = await createCheckoutService(version as AppVersion, schema as SchemaVersion);
const server = app.listen(port, '127.0.0.1', () =>
  console.log(
    `Synthetic checkout: http://127.0.0.1:${port}/orders (${version} application / ${schema} schema). Data resets on restart.`,
  ),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.close(() => {
      close().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 5000).unref();
  });
