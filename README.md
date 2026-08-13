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
MinIO after checking the requesting user owns the `entries/<userId>/...`
prefix — the bucket itself stays private.

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

## What's not done yet

- Real Google OAuth credentials (code path is ready — see Auth above)
- Production deployment config (real S3, managed Postgres, secrets management)
- Automated tests
