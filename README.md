# devyard
Devyard — Build. Test. Deploy. A self-hosted software development, build automation, and deployment platform.

## First run

1. `npm ci && npm run db:migrate`
2. Start the backend bound to localhost (the default `DEVYARD_HOST=127.0.0.1`) and create the first admin, either through `POST /api/v1/auth/bootstrap` or with `npm run user:create-admin -- --username <u> --email <e>` (password from `DEVYARD_ADMIN_PASSWORD` or stdin).
3. **Only after bootstrap is complete**, expose the server through the reverse proxy. Set `DEVYARD_PUBLIC_ORIGINS` to the public URL and `DEVYARD_TRUST_PROXY` to the proxy's address. Until bootstrap is done, anyone who can reach the server can claim the first admin account.
