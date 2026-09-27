# Security and deployment notes

## Data flow
Guest rehearsals execute in disposable, in-memory PGlite instances inside a dedicated browser Worker. The account server never executes uploaded SQL. Guest run history stays in that browser's local storage. Explicit account save stores contract SQL, report rows and metadata in SQLite. Exports contain that same information. Use synthetic fixtures, never customer data or credentials.

## Authentication
The full Express deployment provides salted scrypt password hashing, random opaque session tokens stored as hashes, HttpOnly SameSite cookies, bounded session lifetime, authentication rate limits and per-user ownership checks. Mutating browser requests require the configured application origin. Production must use HTTPS with secure cookies and a private writable persistent data directory. Account creation here is a working local/self-hosted feature, not a managed identity provider. Email ownership verification and password recovery are not implemented; deploy for a controlled team or add an identity provider before a public commercial launch.

## Execution limits
Browser workers terminate after 30 seconds. CLI execution runs in a child process with a 30-second deadline and a JS heap limit. WASM memory is separate from the JavaScript heap; this is not a complete hostile-code memory sandbox. The engine runs no shell commands, contacts no production database, and cannot establish production concurrency/locking safety. Keep SQL fixtures small and trusted. An invariant projection must include all data you want protected; no tool can prove omitted business behavior.

## Evidence integrity
Reports contain the contract hash and raw results. A SHA-256 binds content, but is not a signature or execution attestation. Browser history and API uploads are client-supplied. Use your own CI runner and its retained artifacts for release policy decisions; never treat a client-uploaded report as an enforced authorization to deploy.

## Operational readiness
Before multi-tenant public commercial use: external identity verification/recovery, tested backups/restore, retention/deletion policies, application monitoring, dependency advisories, load/resource testing, independent security review and an isolated trusted CI runner. The included app is tested for the documented workflow; these operational controls are not claimed as completed.
