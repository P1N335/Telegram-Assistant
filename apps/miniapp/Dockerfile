# Контекст сборки — корень монорепо (см. docker-compose.yml).
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/miniapp/package.json apps/miniapp/
RUN pnpm install --frozen-lockfile=false
COPY . .
RUN pnpm --filter @tpc/shared build && pnpm --filter @tpc/miniapp build

FROM nginx:1.27-alpine AS runtime
COPY apps/miniapp/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/miniapp/dist /usr/share/nginx/html
EXPOSE 80
