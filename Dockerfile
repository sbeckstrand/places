FROM node:22-bookworm-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Not run by `pnpm install` (no postinstall hook) and src/generated is
# .dockerignore'd — in local dev this is masked by the bind-mounted host
# copy, but a standalone built image needs it generated explicitly here.
RUN pnpm exec prisma generate

EXPOSE 3000

ENTRYPOINT ["./docker/entrypoint.sh"]
