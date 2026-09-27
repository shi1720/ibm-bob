import { createApp } from './app.js';
const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');
const { app, close } = createApp();
const server = app.listen(port, process.env.HOST ?? '0.0.0.0', () => console.log(`UndoProof listening on port ${port}`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  server.close(() => { close(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
});
