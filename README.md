# devyard
Devyard — Build. Test. Deploy. A self-hosted software development, build automation, and deployment platform.

## First run

1. `npm ci && npm run db:migrate`
2. Start the backend bound to localhost (the default `DEVYARD_HOST=127.0.0.1`) and create the first admin, either through `POST /api/v1/auth/bootstrap` or with `npm run user:create-admin -- --username <u> --email <e>` (password from `DEVYARD_ADMIN_PASSWORD` or stdin).
3. **Only after bootstrap is complete**, expose the server through the reverse proxy. Set `DEVYARD_PUBLIC_ORIGINS` to the public URL and `DEVYARD_TRUST_PROXY` to the proxy's address. Until bootstrap is done, anyone who can reach the server can claim the first admin account.

## Deployment behind Caddy

- **`DEVYARD_TRUST_PROXY` must be set to Caddy's address** (for example `127.0.0.1` when Caddy runs on the same host, or its IP/CIDR on the Docker or LAN network). Without it, Devyard ignores `X-Forwarded-For`, every request appears to come from Caddy, and **all clients share one rate-limit bucket**: one user's failed logins would throttle everyone. Never set it to a range that untrusted clients can connect from, or they can spoof their IP.
- `DEVYARD_PUBLIC_ORIGINS` must list the exact public URL(s) (for example `https://devyard.example.lan`). It is required in production.
- `DEVYARD_COOKIE_SECURE` stays at its production default of `true`, and serving must be over HTTPS.
