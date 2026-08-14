# --- deps: install once, shared by both the dev and production paths ---
FROM node:22-bookworm-slim AS deps

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- dev: what docker-compose.yml builds (target: dev) for local hot reload ---
# Bind-mounts the repo at runtime, so the COPY below is only there to make
# this stage independently buildable/testable — docker-compose's bind mount
# shadows it in practice.
FROM deps AS dev

COPY . .
RUN pnpm exec prisma generate

EXPOSE 3000
ENTRYPOINT ["./docker/entrypoint.sh"]

# --- builder: compiles a real production build ---
FROM deps AS builder

COPY . .
RUN pnpm exec prisma generate
RUN pnpm build

# --- runner: what CI publishes to GHCR (the default target — no --target
# flag needed) ---
FROM node:22-bookworm-slim AS runner

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable

WORKDIR /app
ENV NODE_ENV=production

# The full node_modules (not just production deps) because the entrypoint's
# migrate/seed step needs the `prisma` CLI and `tsx`, both devDependencies —
# next build's own output doesn't need them, but this stage runs both.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/docker ./docker

EXPOSE 3000
ENTRYPOINT ["./docker/entrypoint-prod.sh"]
