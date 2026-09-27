# Security and deployment notes

## Data flow

Guest rehearsals execute in disposable, in-memory PGlite instances inside a dedicated browser Worker. The account server never executes uploaded SQL. Guest run history stays in that browser's local storage. While signed in, completed rehearsal reports automatically save contract SQL, report rows and metadata to private Firestore history in the public Firebase deployment, or SQLite in the self-hosted deployment. Guest runs are never copied into an account automatically. Exports contain that same information. Use synthetic fixtures, never customer data or credentials.

## Authentication

The full Express deployment provides salted scrypt password hashing, random opaque session tokens stored as hashes, HttpOnly SameSite cookies, bounded session lifetime, authentication rate limits and per-user ownership checks. Mutating browser requests require the configured application origin. Production must use HTTPS with secure cookies and a private writable persistent data directory. These controls describe the alternative self-hosted server. It has no email ownership verification or password recovery and is appropriate for a controlled team. The public Firebase deployment uses managed Firebase Authentication with password recovery; email ownership verification is not enabled in either mode.

## Execution limits

Browser workers terminate after 30 seconds. CLI execution runs in a child process with a 30-second deadline and a JS heap limit. WASM memory is separate from the JavaScript heap; this is not a complete hostile-code memory sandbox. The engine runs no shell commands, contacts no production database, and cannot establish production concurrency/locking safety. Keep SQL fixtures small and trusted. An invariant projection must include all data you want protected; no tool can prove omitted business behavior.

## Evidence integrity

Reports contain the contract hash and raw results. A SHA-256 binds content, but is not a signature or execution attestation. Browser history and API uploads are client-supplied. Use your own CI runner and its retained artifacts for release policy decisions; never treat a client-uploaded report as an enforced authorization to deploy.

## Operational readiness

Before a public commercial rollout: email ownership verification, tested backups and restores, retention policies, application monitoring, dependency advisory handling, load and resource testing, independent security review, and an isolated trusted CI runner. The self-hosted account server additionally needs password recovery or an external identity provider. The included app is tested for the documented workflow; these operational controls are not claimed as completed.

## Hosted Firebase accounts

The public deployment uses Firebase Authentication and owner-only Firestore rules. It supports password reset and password-confirmed deletion. See FIREBASE.md for the deletion marker and cloud size limits. Guest SQL stays local; completed rehearsals automatically save to cloud history while signed in. The newest 100 runs are displayed, and packets above 800 KB require local export. Auth state changes cancel active work and clear private UI state to prevent cross-account leakage. Browser evidence remains client-supplied.
