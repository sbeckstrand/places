# Places

A self-hosted app for logging and rating the places you've been — title, photos,
location, date, website, description, category, and a star rating per entry —
with a map view that clusters entries geographically.

## Stack

- **Next.js** (App Router, TypeScript) — single full-stack app, no separate API service
- **PostgreSQL** via **Prisma 7** (driver adapter: `@prisma/adapter-pg`)
- **Auth.js (NextAuth v5)** — email/password (Credentials) now, Google OAuth ready to enable
- **MinIO** (S3-compatible) for photo storage in dev — swap to real S3 in prod by changing env vars
- **MapLibre GL** + OpenFreeMap tiles for the map view, with GeoJSON clustering
- **Tailwind CSS v4**

## Running locally

```bash
cp .env.example .env
```

Fill in `.env` — at minimum set `NEXTAUTH_SECRET` (`openssl rand -base64 32`) and
`DEV_USER_EMAIL` / `DEV_USER_PASSWORD` (the account you'll log in with).

```bash
docker compose up --build
```

This starts four containers:

- `postgres` — Postgres 16, exposed on host port **5433** (not 5432, to avoid clashing
  with anything else already using the default port) — see `docker-compose.yml`
- `minio` — object storage, API on 9000, console on 9001
- `createbuckets` — one-shot job that creates the `foodie-photos` bucket
- `app` — the Next.js dev server on **3000**, with migrations + seeding run automatically
  on startup (see `docker/entrypoint.sh`)

Once it's up, open http://localhost:3000 and log in with the `DEV_USER_EMAIL` /
`DEV_USER_PASSWORD` from your `.env`.

The app container bind-mounts the repo for hot reload; `node_modules` and `.next`
are kept in named Docker volumes so the container's own (Linux) install isn't
clobbered by whatever's in your host `node_modules`.

### Resetting dev data

Data is ephemeral by design during development:

```bash
docker compose down -v   # drops the postgres + minio volumes
docker compose up --build
```

## Auth

- Local dev: email/password via Auth.js's Credentials provider, hashed with bcrypt.
- Google OAuth: the provider is already wired up in `src/lib/auth.ts` but only
  registers itself when `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set — so the
  "Sign in with Google" option just doesn't appear until you configure real
  credentials. No code changes needed to turn it on later.

## Database

- Schema: `prisma/schema.prisma`. Models: `User`, `Entry`, `Photo`, plus the
  Auth.js adapter tables (`Account`, `Session`, `VerificationToken`).
- Migrations live in `prisma/migrations` and run automatically on container
  startup via `prisma migrate deploy`.
- To change the schema during development: edit `schema.prisma`, then run
  `pnpm db:migrate` (needs `DATABASE_URL` pointing at `localhost:5433`, i.e. your
  `.env` as checked in).
- `pnpm db:studio` opens Prisma Studio against the same database.

## Photos

Uploads go through `POST /api/uploads`, which:

1. Reads the file, extracts width/height and best-effort GPS EXIF coordinates
   (`exifr`) — if present, those coordinates prefill the entry's map pin.
2. Stores the object in MinIO under `entries/<userId>/<uuid>.<ext>`.
3. Returns the storage key, which gets attached to the `Entry` on save.

Photos are served back through `GET /api/images/[...key]`, which streams from
MinIO after checking either that the requesting user owns the
`entries/<userId>/...` prefix, or (for anonymous/other-user requests) that the
photo belongs to a public entry — the bucket itself stays private otherwise.

## Map

`/map` shows every entry with coordinates, clustered via MapLibre's built-in
GeoJSON clustering (backed by supercluster). Individual entry pages embed the
same `MapView` component focused on just that one pin. Coordinates come from
either the uploaded photo's GPS EXIF data, the Google import search (see
below), or clicking the location picker's map to drop a pin manually.

## Importing from Google

The entry form has an "Import from Google" field that takes a place name
(e.g. "Joe's Pizza, New York NY") — or a `google.com/maps/place/...` URL, if
you happen to have one — and fills in the title, address, coordinates,
website, and place description (`locationDescription`).

This needs a Google Places API key:

1. Create/select a project at [console.cloud.google.com](https://console.cloud.google.com).
2. Enable **Places API (New)**.
3. Create an API key and restrict it to Places API.
4. Set `GOOGLE_PLACES_API_KEY` in `.env`.

Without a key, the import button just returns an error — everything else
still works, and fields can always be filled in by hand.

How it works (`src/lib/googlePlaces.ts`): the text is sent straight to the
Places API's text search as-is (`editorialSummary` in the response is the
place-description field). A Google Maps share link (`share.google/...`)
can't be resolved server-side — it redirects via client-side JS to a Search
results page, which is exactly the kind of automated traffic Google's bot
detection blocks (confirmed while building this: a headless-browser
resolution attempt got served Google's "unusual traffic" interstitial
instead of the real page). So there's no link-following on the server at
all — if you only have a share link, open it yourself and type in the name,
or copy the resolved `maps.google.com/place/...` URL if your browser lands
on one.

## Sharing & public entries

Entries are private by default. Checking "Make this entry public" on the
entry form (create or edit) makes two things reachable without an account:

- The entry's own page (`/entries/<id>`) — same URL whether you're the owner
  or not; the page itself decides what to show. Edit/Delete only render for
  the owner.
- `/u/<userId>/map` — a per-user map showing only that user's public,
  located entries. Always live at that URL (no separate toggle); it just has
  nothing on it until you have at least one public entry with a pin. Grab
  the link from the "Copy public map link" button on your own `/map` page.

Route-level access is enforced in `src/proxy.ts` (this Next.js version's
renamed `middleware.ts`) — it explicitly allow-lists `/entries/<id>` (not
`/entries/new` or `/entries/<id>/edit`), `/u/*`, and `/api/images/*` to pass
through without a session; everything else still redirects to `/login`. Each
of those routes then does its own `isPublic` check against the database —
the proxy only decides who's allowed to *ask*.

## CI / container image

`.github/workflows/docker-build.yaml` builds `Dockerfile`'s default target
and pushes it to `ghcr.io/sbeckstrand/foodie` on every push to `main` (or
manually via `workflow_dispatch`), tagged with the short commit SHA. A second
job then updates the image tag in the `k8s-apps` repo
(`apps/services/places/values-image.yaml`, using the `K8S_APPS_PAT` secret)
for GitOps-style deploys.

`Dockerfile` is multi-stage with two independent targets:

- **`dev`** (what `docker-compose.yml` builds via `target: dev`) — installs
  everything and defers to the bind-mounted source + `next dev` for local hot
  reload, same as before.
- **`runner`** (the default target, last in the file, so CI's plain
  `docker build` picks it automatically) — a real `next build`, run via
  `next start`. The entrypoint (`docker/entrypoint-prod.sh`) calls the
  installed binaries directly (`node_modules/.bin/{prisma,tsx,next}`) rather
  than `pnpm exec`/`pnpm start` — pnpm re-verifies the lockfile against
  `node_modules` on every invocation, and since this stage only copies
  `node_modules` (no `pnpm-lock.yaml`), that re-triggers a full install on
  every container start, which then fails on the interactive supply-chain
  build-script approval gate.

Switching off `next dev` in production wasn't just a size/performance
cleanup — it fixed several real bugs that only manifested under real traffic:
a `next dev`-only cross-origin guard that silently broke all client-side
interactivity when accessed via a non-localhost hostname, each replica
generating its own random Server Actions encryption key at startup (so form
submissions failed whenever they landed on a different pod than the one that
rendered the page), and a hydration-timing race where the page looked ready
before the (much larger, unminified) dev bundle had actually finished
hydrating.

One more prod-only env var this required: `@auth/core` only auto-trusts the
request's `Host` header when `NODE_ENV !== "production"` — dev mode got this
for free, but behind Traefik in production it needs `AUTH_TRUST_HOST=true`
set explicitly (already wired into the chart).

## What's not done yet

- Real Google OAuth credentials (code path is ready — see Auth above)
- Production deployment config (real S3, managed Postgres, secrets management)
- Automated tests
