# Deployment modes

## Public browser demo
https://shi1720.github.io/ibm-bob/

The public deployment uses GitHub Pages and executes real PostgreSQL in a browser worker. Custom contracts, SQL editing, all rehearsal checks, candidate repair previews, local history, and evidence exports work without authentication. This deployment does not send SQL to our server or offer cloud accounts. The account dialog explains the included self-hosted option. The public demo stays useful without an expiring trial or API key.

## Account-enabled deployment
See [the server guide](../server/README.md). `npm ci && npm run build && npm start` runs the full application on port 3001. SQLite persistence belongs in a private writable directory backed by a durable volume. The Docker image sets port 3000 explicitly; configure an HTTPS reverse proxy, APP_ORIGIN, DATA_DIR and persistence as documented.

For local Vite development, run the API with APP_ORIGIN=http://127.0.0.1:5173 on port3001 so the browser origin is recognized. The Vite server proxies /api to that port.

Account creation, sign-in, logout, per-user evidence persistence and password-confirmed account deletion are implemented and tested. Email verification/recovery, paid billing, team invitations and hosted managed service are not implemented. Do not present the free browser deployment as a paid SaaS service.

## Costs
Rehearsal inference cost is zero: no model is called by the engine. GitHub Pages hosts the static demonstration; it is not a promise of free commercial hosting. Self-host costs depend on infrastructure and volume. Bob usage consumes the participant's allocated Bobcoins. Proposed $99/team/month pricing is a customer-discovery hypothesis, not live billing or validated willingness to pay.
