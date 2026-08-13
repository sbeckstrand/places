#!/bin/sh
set -e

# Turbopack opens far more file descriptors scanning node_modules than most
# container runtimes' default ulimit allows, which crashes `next dev` with
# "Too many open files (os error 24)". Raise the soft limit to whatever the
# hard ceiling permits; harmless if it's already high (e.g. local dev).
ulimit -n "$(ulimit -Hn)" 2>/dev/null || true

echo "Applying database migrations..."
pnpm exec prisma migrate deploy

echo "Seeding dev user..."
pnpm exec prisma db seed

echo "Starting Next.js dev server..."
exec pnpm dev
