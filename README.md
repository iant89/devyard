# devyard
Devyard — Build. Test. Deploy. A self-hosted software development, build automation, and deployment platform.

## First run

1. `npm ci && npm run db:migrate`
2. Start the backend bound to localhost (the default `DEVYARD_HOST=127.0.0.1`) and create the first admin, either through `POST /api/v1/auth/bootstrap` or with `npm run user:create-admin -- --username <u> --email <e>` (password from `DEVYARD_ADMIN_PASSWORD` or stdin).
3. **Only after bootstrap is complete**, expose the server through the reverse proxy. Set `DEVYARD_PUBLIC_ORIGINS` to the public URL and `DEVYARD_TRUST_PROXY` to the proxy's address. Until bootstrap is done, anyone who can reach the server can claim the first admin account.

## Deploy

Devyard runs behind Caddy (spec §13). Production environment, for example in `/opt/devyard/devyard.env`:

```sh
NODE_ENV=production
# Required in production: the exact public origin(s) browsers use. Scheme, host and port must match.
DEVYARD_PUBLIC_ORIGINS=https://devyard.example.com
# Must be Caddy's address (IP or CIDR). Same host: 127.0.0.1. On a Docker network, e.g. 172.18.0.0/16.
DEVYARD_TRUST_PROXY=127.0.0.1
# Stays true in production (false is rejected at startup).
DEVYARD_COOKIE_SECURE=true
```

- **`DEVYARD_TRUST_PROXY` must be set to Caddy's address.** Without it, Devyard ignores `X-Forwarded-For` and every request appears to come from Caddy, so **all clients share one rate-limit bucket** and one user's failed logins throttle everyone. Never set it to a range untrusted clients can connect from, or they can spoof their IP.
- **`DEVYARD_PUBLIC_ORIGINS` is required in production** (for example `https://devyard.example.com`, comma-separated for more than one). The server refuses to start without it. Unsafe requests whose `Origin`/`Referer` isn't listed are rejected with `403 CSRF_FAILED`, including requests from non-browser clients, which must send a matching `Origin` header.
- Serve only over HTTPS. Finish bootstrap (see First run) before exposing the server.
