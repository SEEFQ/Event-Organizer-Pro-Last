# Running Outdoor Event Hub Locally

Follow these steps after downloading and unzipping the project on your laptop.

---

## Prerequisites

Install these tools once (skip if already installed):

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20 or 24 | https://nodejs.org |
| pnpm | latest | `npm install -g pnpm` |
| PostgreSQL | 14+ | https://www.postgresql.org/download/ |

---

## 1. Create a PostgreSQL database

Open a terminal and run:

```bash
psql -U postgres
```

Then inside the psql prompt:

```sql
CREATE DATABASE outdoor_event_hub;
\q
```

---

## 2. Set the DATABASE_URL environment variable

Create a file named `.env` in the **project root** (next to `package.json`):

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/outdoor_event_hub
```

Replace `YOUR_PASSWORD` with your PostgreSQL password. If you have no password set, use:

```
DATABASE_URL=postgresql://postgres@localhost:5432/outdoor_event_hub
```

---

## 3. Install dependencies

In the project root, run:

```bash
pnpm install
```

---

## 4. Push the database schema

```bash
pnpm --filter @workspace/db run push
```

This creates all tables (events, registrations, sponsors, participants, etc.).

---

## 5. (Optional) Seed with sample data

To populate the database with realistic events, sponsors, participants, and registrations:

```bash
pnpm --filter @workspace/scripts run seed
```

> **Note:** Only run this once on a fresh database. Running it again will create duplicate data.

---

## 6. Start the API server

Open a terminal and run:

```bash
PORT=8080 BASE_PATH=/api pnpm --filter @workspace/api-server run dev
```

The API will be available at `http://localhost:8080/api`.

---

## 7. Start the frontend

Open a **second** terminal and run:

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/event-hub run dev
```

Then open **http://localhost:5173** in your browser.

> **Important:** The frontend expects the API to be at `/api`. In production/Replit this is handled by a shared reverse proxy. Locally, you need to add a Vite proxy config or set the API base URL. See the note below.

### Vite proxy for local development

If API requests fail in the browser, add a proxy to `artifacts/event-hub/vite.config.ts`:

```ts
server: {
  proxy: {
    '/api': 'http://localhost:8080',
  },
},
```

---

## 8. Environment variables reference

| Variable | Where | Description |
|----------|-------|-------------|
| `DATABASE_URL` | API server | PostgreSQL connection string |
| `PORT` | API server | Port the API listens on (default: 8080) |
| `PORT` | Frontend | Port Vite dev server listens on |

---

## Summary of commands (quick start)

```bash
# Terminal 1 — API
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/outdoor_event_hub \
PORT=8080 BASE_PATH=/api \
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend
PORT=5173 BASE_PATH=/ \
pnpm --filter @workspace/event-hub run dev
```

Open **http://localhost:5173** and you're ready to go.
