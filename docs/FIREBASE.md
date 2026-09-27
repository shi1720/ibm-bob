# Firebase deployment

Live application: https://undoproof.web.app

Project: `undoproof`. Firebase Hosting serves the React app over HTTPS. Firebase Authentication provides email/password sign-in and password recovery. Firestore keeps each account's evidence under `users/{uid}/runs`. Guest rehearsals remain local to the browser. Completed rehearsals automatically save to private cloud history while signed in; signing in does not upload existing guest runs. Email ownership verification is not enabled. SQL executes only in the isolated browser worker, never in Firestore or a production database.

## Deploy the existing project

```sh
npm ci
npm test
npm run deploy:firebase
```

The deployment script uses the authenticated Firebase CLI, fetches the public web-app configuration, builds with a root URL, and deploys Hosting, Firestore rules and indexes together. It never reads or publishes an OpenAI key. Firebase web configuration identifies the app; authorization comes from Authentication and Firestore rules. The deployment operator needs permission on the existing project.

For a local cloud-enabled build, set `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_APP_ID` in ignored `.env.production.local`. To build the Express/self-host version instead, explicitly set `VITE_FIREBASE_API_KEY='' npm run build`. In CI the local file is absent.

## Verify the deployed application

```sh
PUBLIC_DEMO_URL=https://undoproof.web.app node scripts/smoke-public.mjs
E2E_FIREBASE=1 E2E_BASE_URL=https://undoproof.web.app npx playwright test tests/e2e/firebase.e2e.ts
```

These tests use synthetic fixtures and disposable test accounts. Do not run tests against real customer accounts. Cloud reports are client-supplied, not server-attested execution evidence. A report is limited to 800 KB for cloud storage; export larger results locally. The interface displays the newest 100 saved reports. This display limit is not a retention or deletion policy.

## Account deletion and boundaries

Deletion requires password reauthentication. It first writes an irreversible account deletion marker, then removes private evidence, then deletes the authentication identity. The marker prevents another tab or a still-valid old token from recreating private runs. The retained marker contains only a random account ID and `deleting: true`, with no email, SQL, or evidence. If cleanup is interrupted, sign in and retry deletion.

The project uses the no-cost Spark plan. No billing account was linked. Free-tier quota exhaustion can stop cloud functionality; guest PostgreSQL rehearsals remain local. A commercial rollout still needs retention policies, operational monitoring, backup/restore procedures, and an independent security review. This deployment is not a claim of production lock or concurrency coverage.
