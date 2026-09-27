# Deployment modes

## Public Firebase application

[Open UndoProof](https://undoproof.web.app). Firebase Hosting serves the app, Firebase Authentication handles email/password accounts and password reset, and owner-only Firestore rules protect private history. Guest rehearsals, SQL editing, repair previews and exports work without an account. Signed-in rehearsals automatically save evidence to the account; existing guest runs remain on the device. The engine always executes SQL in a browser worker, never in Firestore or a production database.

See [the Firebase guide](FIREBASE.md) for repeatable deployment, live tests, deletion behavior and cloud limits. Email ownership verification is not enabled. Billing, team invitations, enterprise roles and commercial operations are not implemented.

## Alternative self-hosted accounts

See [the server guide](../server/README.md). Run `npm ci`, `VITE_FIREBASE_API_KEY='' npm run build`, and `npm start` to serve the Express account implementation on port 3001. The explicit empty Firebase key prevents an existing local Firebase build configuration from selecting cloud accounts. SQLite persistence belongs in a private writable directory backed by a durable volume. The Docker image sets port 3000; configure an HTTPS reverse proxy, APP_ORIGIN, DATA_DIR and persistence as documented.

For local Vite development, run the API with `APP_ORIGIN=http://127.0.0.1:5173` on port 3001 so the browser origin is recognized. The Vite server proxies `/api` to that port. Self-hosted accounts support registration, login, logout, private evidence and password-confirmed deletion, but not email verification or password recovery.

## Legacy static demonstration

The [GitHub Pages deployment](https://shi1720.github.io/ibm-bob/) runs guest rehearsals. Use the Firebase application for hosted accounts and the current public experience.

## Costs and limits

Rehearsal inference cost is zero: no model is called by the engine. The Firebase project uses the no-cost Spark plan with no linked billing account. Cloud functionality is subject to free-tier quotas; it is not a promise of unlimited hosting. Guest PostgreSQL rehearsals execute locally. Self-host costs depend on infrastructure and volume. Bob usage consumes the participant's allocated Bobcoins. Proposed $99/team/month pricing is a customer-discovery hypothesis, not live billing or validated willingness to pay.
