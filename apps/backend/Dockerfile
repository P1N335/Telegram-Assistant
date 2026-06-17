# Контекст сборки — корень монорепо (см. docker-compose.yml).
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# ── deps: ставим зависимости с учётом workspace ──────────────
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY packages/database/package.json packages/database/
COPY apps/backend/package.json apps/backend/
RUN pnpm install --frozen-lockfile=false

# ── build: компилируем shared, генерируем prisma, билдим backend ──
FROM deps AS build
COPY . .
RUN pnpm --filter @tpc/shared build \
 && pnpm --filter @tpc/database generate \
 && pnpm --filter @tpc/backend build

# ── runtime ──────────────────────────────────────────────────
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/apps/backend
EXPOSE 3000
CMD ["node", "dist/main.js"]
