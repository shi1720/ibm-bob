# Application testing instructions

## Quick evaluation in a browser

Open https://undoproof.web.app. Use a current Chrome, Edge, Firefox or Safari browser. No API key or production database connection is needed for the guest rehearsal. The first run downloads PostgreSQL WebAssembly assets, so allow it a few seconds.

1. Select **The disappearing order** sample.
2. Click **Run rehearsal**. Expect a **blocked** result. This is the intended finding, not an application error.
3. Open the failed data-preservation check. There are four projected orders before rollback and three afterward. Order **104**, written after deployment, is missing even though the rollback SQL executed successfully.
4. Click **Export evidence** to download the real contract and report. Preserve this failed result.
5. Click **Review repair**. Read the proposed SQL: the repair retains the compatible additive schema instead of restoring an old table snapshot.
6. Click **Apply & rehearse**. Expect **10 of 10 checks passed**. Inspect data preservation again: all four projected orders survive unchanged.
7. Open **Run history** to compare the failed and repaired runs. Guest history belongs to the current browser. Export important evidence before clearing browser data.
8. Try the incompatible column-rename sample, then the safe additive sample. Their expected outcomes are blocked and passed respectively.
9. Open the contract editor, change the SQL, and rerun. A changed contract requires new evidence; an old report does not verify an edit.

The **Bob handoff** button downloads a prompt containing the contract and available evidence. Open that file in Bob IDE for a repository investigation. It does not make an automatic model call.

Use only synthetic fixtures. A passing rehearsal covers the supplied SQL and invariant, not untested application paths, production traffic, locks or every PostgreSQL extension.

## Reproduce the command-line gate

Requires Node.js 22.12 or newer.

```sh
git clone https://github.com/shi1720/ibm-bob.git
cd ibm-bob
npm ci
npm run rehearse -- demo:snapshot --out=blocked-report.json
```

The deliberately unsafe contract exits **1**. Then run:

```sh
npm run rehearse -- demo:snapshot --repair --out=repaired-report.json
```

The supplied repair exits **0**. Invalid input, engine failures and timeouts exit **2**. Compare the reports' data-preservation results rather than expecting a particular runtime.

## Test hosted accounts

1. On https://undoproof.web.app, choose **Sign in to a workspace**, then create an account with a test email you control and a password of at least 12 characters.
2. Run a rehearsal while signed in. Open your private workspace history and confirm the report appears.
3. Sign out, then sign in again. Confirm that your private report is still available and that guest history remains separate.
4. To test recovery, use the password-reset option with your own email address and follow the email link. Email delivery can depend on your mail provider.
5. Open account settings to delete the test account. Deletion requires your password and removes your private evidence. Export anything you want to retain first.

Firebase Authentication manages sign-in; Firestore access rules restrict private reports to their owner. Uploaded reports remain client-provided evidence, not independent execution attestations. If the free cloud quota is exhausted, guest rehearsals still execute locally.

## Test the account-enabled server locally

```sh
npm run build
npm start
```

Open http://localhost:3001. Create a test account, run a rehearsal, sign out and sign in again to confirm private history persists. Guest history remains separate. Account settings support password-confirmed deletion. The server stores browser-provided evidence; it does not independently attest that evidence.

## Test against runnable application source

```sh
npm run sample:contract
npm run rehearse -- examples/checkout-app/generated/unsafe.json
npm run sample:contract -- --candidate
npm run rehearse -- examples/checkout-app/generated/candidate.json
```

Expect the unsafe contract to block and the candidate to pass. The source-derived sample uses order **204**. See `examples/checkout-app/README.md` for HTTP requests and the mapping from application queries to the generated contract.

## Run the automated checks

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The suite includes real PostgreSQL rehearsals and production-browser flows. See `docs/VALIDATION.md` for the verification record and the repository's GitHub Actions for current CI results.
