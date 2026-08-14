#!/bin/sh
set -e

echo "Applying database migrations..."
pnpm exec prisma migrate deploy

echo "Seeding dev user..."
pnpm exec prisma db seed

echo "Starting Next.js production server..."
exec pnpm start
