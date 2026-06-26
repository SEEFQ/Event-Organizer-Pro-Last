# Outdoor Event Hub — AI Assistant Prompt

You are helping develop **Outdoor Event Hub**, a full-stack web application for managing outdoor group events (hiking, cycling, walking tours, summer night walks). The organizer runs the app; participants access it via shared links.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript, Tailwind CSS v4, shadcn/ui components |
| Backend | Express 5 + TypeScript, Node.js 24, ESM/esbuild bundle |
| Database | PostgreSQL 16 + Drizzle ORM (`drizzle-orm`, `drizzle-kit`) |
| Validation | Zod v4 (`zod/v4`) + `drizzle-zod` |
| API Contract | OpenAPI 3.1 spec → Orval codegen (React Query hooks + Zod schemas) |
| Package Manager | pnpm v9 workspaces monorepo |

---

## Monorepo Structure

```
/
├── artifacts/
│   ├── api-server/          — Express API, port 8080, BASE_PATH=/api
│   │   └── src/routes/      — events.ts, registrations.ts, participants.ts,
│   │                           sponsors.ts, public.ts, stats.ts, photos.ts
│   └── event-hub/           — React/Vite frontend, port auto (dev), BASE_PATH=/
│       └── src/pages/       — admin.tsx, register.tsx, sponsors.tsx,
│                               participants.tsx, home.tsx, events.tsx,
│                               event-detail.tsx, photos.tsx
├── lib/
│   ├── db/src/schema/       — Drizzle schema (source of truth for DB)
│   ├── api-spec/            — openapi.yaml (source of truth for API contract)
│   ├── api-client-react/    — Generated React Query hooks (DO NOT EDIT MANUALLY)
│   └── api-zod/             — Generated Zod schemas (DO NOT EDIT MANUALLY)
├── docker-compose.yml
├── Dockerfile.api
├── Dockerfile.web
└── docker/nginx.conf
```

---

## Database Schema (Drizzle, PostgreSQL)

**`events`** — id, title, description, category (cycling|hiking|summer-night|walking), date, location, capacity, status (upcoming|ongoing|completed|cancelled), difficulty, distance, imageUrl, meetingPoint, guidelines, pointsValue, registrationToken (UUID), photoToken (UUID), photoUrl, createdAt

**`registrations`** — id, eventId, name, email, phone, status (pending|confirmed|waitlist|cancelled), referralToken (UUID), referredByRegistrationId, referralCount, registeredAt

**`participants`** — id, email (unique), name, totalPoints, totalEvents, referralCount, joinedAt

**`sponsors`** — id, name, type (cafe|restaurant|camping|hotel|gym|shop|other), website, instagram, facebook, logoUrl, description, discountCode, createdAt

**`event_sponsors`** — eventId, sponsorId (junction table, unique per pair)

**`sponsor_impressions`** — id, sponsorId, eventId, pageType (registration|photo|link_click), createdAt

**`activity_log`** — id, type, description, eventTitle, eventId, createdAt

**`photos`** — id, eventId, uploaderName, caption, objectPath, createdAt

---

## Key Business Rules

1. **Registration flow**: Participant visits `/r/:token` → submits name/email/phone → status defaults to `pending` → organizer confirms/declines from admin dashboard → on confirm, participant earns `event.pointsValue` points.

2. **Re-registration**: If a participant's registration is `cancelled`, they can re-submit via the same link. The new registration creates a fresh `pending` entry (the old cancelled record stays for history).

3. **Sponsor impressions**: Every time the registration page (`/r/:token`) or photo page is loaded, all sponsors linked to that event receive a `pageType=registration|photo` impression. When a participant clicks a sponsor link, a `pageType=link_click` impression is recorded via `POST /api/public/sponsor-click`.

4. **Points**: Awarded only when transitioning FROM non-confirmed TO confirmed. If someone is confirmed → cancelled → re-confirmed, points are NOT re-awarded (the PATCH endpoint only awards on first transition).

5. **Referrals**: Each registration gets a `referralToken`. Sharing `?ref=<token>` in the registration URL links the new registrant to the referrer. On confirmation, both get +1 bonus point.

---

## API Endpoints (BASE_PATH = /api)

### Events
- `GET /api/events` — list events, optional `?category=` `?upcoming=true`
- `POST /api/events` — create event
- `GET /api/events/:id` — get single event
- `PATCH /api/events/:id` — update event
- `DELETE /api/events/:id` — delete event
- `GET /api/events/:id/registrations` — list all registrations for event
- `GET /api/events/:id/sponsors` — list sponsors for event
- `POST /api/events/:id/sponsors` — link sponsor to event
- `DELETE /api/events/:id/sponsors/:sponsorId` — unlink sponsor

### Registrations
- `PATCH /api/registrations/:id` — update status (pending|confirmed|waitlist|cancelled). Awards points on confirm transition.
- `DELETE /api/registrations/:id` — mark as cancelled (legacy route)

### Sponsors
- `GET /api/sponsors` — list all sponsors with stats (totalImpressions, registrationImpressions, photoImpressions, linkClicks, eventsCount)
- `POST /api/sponsors` — create sponsor
- `GET /api/sponsors/:id` — get sponsor with stats
- `PATCH /api/sponsors/:id` — update sponsor
- `DELETE /api/sponsors/:id` — delete sponsor

### Participants
- `GET /api/participants` — list all participants (sorted by totalPoints)
- `GET /api/participants/:email/events` — event history for participant (ALL statuses including cancelled)

### Public (no auth, participant-facing)
- `GET /api/public/register/:token` — get event + sponsors by registration token (also fires impression tracking)
- `POST /api/public/register/:token` — submit registration
- `POST /api/public/sponsor-click` — track a sponsor link click `{ sponsorId, eventId }`
- `GET /api/public/photos/:token` — get event + photos by photo token
- `POST /api/public/photos/:token` — upload photo

### Stats
- `GET /api/stats` — dashboard stats (totalEvents, upcomingEvents, totalParticipants, totalRegistrations)

---

## Frontend Pages

| Route | File | Purpose |
|-------|------|---------|
| `/admin` | admin.tsx | Organizer dashboard: event list, create/edit events, manage registrations (Pending/Confirmed/Waitlist/Cancelled sections), link sponsors |
| `/admin/sponsors` | sponsors.tsx | Sponsor CRUD + impression stats |
| `/admin/participants` | participants.tsx | Points leaderboard + event history per participant |
| `/r/:token` | register.tsx | Public registration form + sponsor display |
| `/admin/create` | create-event.tsx | Create new event form |
| `/events` | events.tsx | Public event listing |
| `/events/:id` | event-detail.tsx | Single event detail |
| `/photos/:token` | photos.tsx | Photo gallery |

---

## Codegen Workflow

**IMPORTANT**: Never manually edit files in `lib/api-client-react/` or `lib/api-zod/`. These are generated.

When you change the API contract:
1. Edit `lib/api-spec/openapi.yaml` first
2. Run: `pnpm --filter @workspace/api-spec run codegen`
3. Update the backend route to match
4. Update the frontend to use the new hook/type

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `PORT` | Yes | Port for the service to listen on |
| `BASE_PATH` | Yes | URL base path (api-server: `/api`, event-hub: `/`) |
| `NODE_ENV` | No | `production` for prod builds |

---

## Running Locally (Replit / pnpm workspace)

```bash
# Install deps
pnpm install

# Push DB schema
pnpm --filter @workspace/db run push

# Seed database
pnpm --filter @workspace/db run seed

# Start API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Start frontend (uses PORT env var from Replit workflow)
pnpm --filter @workspace/event-hub run dev
```

## Running with Docker

```bash
# Copy and edit environment variables
cp .env.example .env

# Build and start all services
docker compose up --build

# Access the app at http://localhost
# API available at http://localhost/api
```

The `migrate` service runs `drizzle-kit push` automatically before the API starts. To seed the database after first run:

```bash
docker compose exec api node -e "/* run seed logic */"
# Or connect directly: psql postgresql://postgres:postgres@localhost:5432/outdoor_event_hub
```

---

## Architecture Decisions

- **Contract-first API**: OpenAPI spec → Orval codegen → typed React Query hooks. Never write raw fetch calls in the frontend.
- **Pending-by-default registrations**: All new registrations start as `pending`. Organizer manually confirms. This prevents auto-confirming spam registrations.
- **pgEnum comparisons in raw SQL**: When using Drizzle's `sql` tagged template for correlated subqueries, use `column::text = 'value'` (explicit text cast) and reference the outer table using raw SQL table names (e.g., `events.id` not `${eventsTable.id}`) to avoid Drizzle parameterization issues.
- **Participant upsert on registration**: When a registration is submitted, a participant record is created with 0 points. This ensures ALL registrants (even pending/cancelled) appear in the participants list. Points are only incremented on confirmation.
- **Impression tracking**: `trackImpressions()` fires on GET (page load) and is fire-and-forget (`catch(() => {})`). Link clicks are tracked separately via POST endpoint to distinguish views from engagement.

---

## Current State (as of last session)

- All five events have confirmed registration counts working correctly
- Admin panel shows four sections: Pending (Confirm/Decline), Confirmed (Cancel), Waitlist (Confirm), Cancelled (Reinstate)
- Sponsor stats show Link Clicks separately from Total Views / Registration Views / Photo Views
- Participants page shows event history including cancelled events (with a red "cancelled" badge)
- Anyone who submits a registration form appears in the participants list immediately

---

## Common Pitfalls

- Do NOT run `pnpm run dev` at the workspace root — it has no dev script
- Do NOT edit generated files in `lib/api-client-react/` or `lib/api-zod/`
- `drizzle-kit push` syncs schema directly (no migration files) — safe for dev, use with care in prod
- The `seed.ts` script inserts data idempotently for events but not for sponsors — running it twice creates duplicate sponsors
- `import.meta.env.BASE_URL` in frontend code gives the base path (always ends with `/`)
- All API calls in the frontend go through the generated hooks — the hooks prepend `/api` automatically via the axios client base URL
