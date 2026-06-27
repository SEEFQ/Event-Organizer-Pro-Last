# ── Stage 1: Install all workspace dependencies ───────────────────────────────
FROM node:20-alpine AS deps
RUN npm install -g pnpm@10
WORKDIR /app

# Copy every package.json so pnpm can resolve the workspace graph
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY artifacts/api-server/package.json      ./artifacts/api-server/
COPY artifacts/event-hub/package.json       ./artifacts/event-hub/
COPY artifacts/mockup-sandbox/package.json  ./artifacts/mockup-sandbox/
COPY lib/api-client-react/package.json      ./lib/api-client-react/
COPY lib/api-spec/package.json              ./lib/api-spec/
COPY lib/api-zod/package.json               ./lib/api-zod/
COPY lib/db/package.json                    ./lib/db/
COPY lib/object-storage-web/package.json    ./lib/object-storage-web/
COPY scripts/package.json                   ./scripts/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build frontend + API server ──────────────────────────────────────
FROM deps AS builder
COPY . .

# Build the React/Vite frontend.
# PORT is only used by the dev server but vite.config.ts requires it at build time.
# BASE_PATH=/ deploys the SPA at the root path (served by the API in production).
RUN BASE_PATH=/ PORT=3000 pnpm --filter @workspace/event-hub run build

# Build the API server (esbuild bundles all workspace libs into one ESM file).
RUN pnpm --filter @workspace/api-server run build

# ── Stage 3: Lean production image ────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Only the esbuild-bundled dist files are needed at runtime — no node_modules required.
COPY --from=builder /app/artifacts/api-server/dist  ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/event-hub/dist/public ./artifacts/event-hub/dist/public

ENV NODE_ENV=production
ENV PORT=8080
ENV STATIC_DIR=/app/artifacts/event-hub/dist/public

EXPOSE 8080

CMD ["node", "--enable-source-maps", "/app/artifacts/api-server/dist/index.mjs"]
