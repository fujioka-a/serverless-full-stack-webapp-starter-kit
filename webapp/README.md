## Run locally

```bash
# Use Node.js 22.x (the repository root has .nvmrc)
nvm use

# Run these commands in the webapp directory
cd webapp
npm ci

# Return to the repository root
cd ..

# Start local PostgreSQL and sync the Prisma schema
docker compose up -d
scripts/setup-local-db.sh

# Generate webapp/.env.local from deployed stack outputs
scripts/setup-local-webapp-env.sh ServerlessWebappStarterKitStack us-west-2

# Start the app
cd webapp
npm run dev
```

Open [http://localhost:3010](http://localhost:3010) with your browser to see the result.
Local PostgreSQL is exposed on `127.0.0.1:5433` to avoid conflicts with existing SSH/RDS port-forward sessions on `5432`.
`scripts/setup-local-db.sh` tries `prisma db push` first and falls back to recreating the local `public` schema from `prisma/schema.prisma` if Prisma's schema engine fails. The fallback resets local tables.

## Environment variables

- Runtime env vars (e.g. `USER_POOL_ID`, `COGNITO_DOMAIN`) are set in `.env.local` for local development and injected via CDK `environment` for deployed builds.
- Build-time env vars prefixed with `NEXT_PUBLIC_` must be set as CDK build args in `webapp.ts` — they are baked into the Docker image at build time and cannot be changed at runtime.
- For local auth and async-job verification, `.env.local` should be generated from deployed stack outputs and your shell must have AWS credentials that can invoke Lambda and access AppSync/Cognito-related APIs.

See `.env.local.example` for the full list.

## Development guide

See [`AGENTS.md`](../AGENTS.md) in the repository root for authentication patterns, async job setup, DB migration, coding conventions, and constraints.
