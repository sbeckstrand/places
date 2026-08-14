#!/bin/sh
set -e

# Deliberately not `pnpm exec`/`pnpm start` here: pnpm re-verifies the
# lockfile against node_modules on every invocation, and since this stage
# only copies node_modules (no pnpm-lock.yaml), that check re-triggers a
# full `pnpm install` on every container start — which then hits the
# interactive supply-chain build-script approval gate and fails outright.
# Calling the installed binaries directly skips pnpm at runtime entirely.

echo "Applying database migrations..."
node_modules/.bin/prisma migrate deploy

echo "Seeding dev user..."
node_modules/.bin/tsx prisma/seed.ts

echo "Starting Next.js production server..."
exec node_modules/.bin/next start
