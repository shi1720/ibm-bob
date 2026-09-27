# Private workspace server

The browser runs PostgreSQL rehearsals. This server handles accounts and private saved reports. Submitted evidence is client-supplied local evidence, **not server-attested**. It never executes uploaded SQL. No external API keys are needed.

## Local development

```sh
npm ci
VITE_FIREBASE_API_KEY='' npm run build
APP_ORIGIN=http://localhost:3001 npm start
```

Open `http://localhost:3001`. The server defaults to port 3001; the production Docker image explicitly uses 3000. Default data path is `./data/undoproof.sqlite`; set `DATA_DIR` to change it. Environment files are not automatically loaded. GitHub Pages runs the guest-only application. The public Firebase deployment is a separate account backend; see [the Firebase guide](../docs/FIREBASE.md). Vite loads local build configuration, so the explicit empty Firebase key above selects this Express backend.

For live frontend development, run `APP_ORIGIN=http://localhost:5173 npm run server` and, in a second terminal, `npm run dev`. Vite forwards `/api` to `http://127.0.0.1:3001`. Open the exact localhost origin configured above; an unexpected Vite port or switching to `127.0.0.1` requires matching `APP_ORIGIN`.

## Production

```sh
docker build -t undoproof .
docker volume create undoproof-data
docker run --name undoproof --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -e APP_ORIGIN=https://undoproof.example.com \
  -e TRUST_PROXY_HOPS=1 \
  -v undoproof-data:/app/data undoproof
```

Place an HTTPS reverse proxy in front of port 3000. For example, Caddy can use:

```caddyfile
undoproof.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

Replace the domain, configure DNS, and permit the proxy's TLS certificate issuance. `APP_ORIGIN` must exactly identify the browser-facing HTTPS origin in production. Secure HttpOnly cookies require HTTPS. The example binds the backend to loopback so clients cannot bypass the proxy. `TRUST_PROXY_HOPS=1` is valid only for exactly one trusted proxy and no direct client access; use `0` for direct connections. More complex ingress needs its own tested proxy trust configuration. The server does not enable CORS.

Container runs as the unprivileged `node` user and retains SQLite in the volume. Back up the entire volume while the app is stopped, or use SQLite's online backup facility; copying only the main database while WAL is active can lose writes. Keep backups private, test restores, and apply an appropriate retention policy. Do not publish the volume, `.env` files, or real customer SQL.

## API

All mutations except bodyless run deletion accept JSON; mutation requests carrying an Origin must match `APP_ORIGIN`. Origin-less CLI requests are allowed. Cross-site browser fetches are rejected. Auth uses scrypt-salted passwords and random, hashed, seven-day session tokens. Login rotates the browser's previous session. Login/registration/deletion share a 20-attempt/15-minute IP limit, plus 180 API requests/minute. Rate limits are process-local; this SQLite deployment is a single server, not a multi-replica service.

| Route                     | Behavior                                                                  |
| ------------------------- | ------------------------------------------------------------------------- |
| `GET /api/health`         | Status and evidence provenance                                            |
| `GET /api/auth/me`        | `{user: {id,email,name} \| null}`                                         |
| `POST /api/auth/register` | `{email,password,name}`; 12–128 character password; starts session        |
| `POST /api/auth/login`    | `{email,password}`; starts session                                        |
| `POST /api/auth/logout`   | `{}`; destroys current session                                            |
| `DELETE /api/auth/me`     | `{password}`; atomically deletes account, all sessions, all saved runs    |
| `GET /api/runs`           | `{runs:[{id,contract,report,createdAt,evidenceSource}]}` for current user |
| `POST /api/runs`          | `{contract,report}`; returns `{run}` with server-generated storage ID     |
| `DELETE /api/runs/:id`    | Deletes own run; 204 success, 404 for absent/other users' IDs             |

Bodies are capped at 2 MB and records at 100 per user. SQL is stored as text. Report shape and contract association are validated, but report claims are not attested or independently recomputed by this server. Evidence is never rendered by the server as HTML.

This self-hosted account implementation has no email verification, password recovery, MFA, organization roles, or billing. Firebase-hosted accounts separately provide password recovery; email ownership verification is not enabled there either. Deploy behind suitable infrastructure and evaluate these needs before offering public commercial accounts. Account deletion removes active data immediately; separately managed backups follow the operator's retention policy.

Run `npx vitest run tests/server.test.ts` for real HTTP tests covering auth, ownership, deletion, expiry, persistence, origin protection, payload limits, and rate limiting.
