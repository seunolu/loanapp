# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.json ./
COPY apps/admin/package.json apps/admin/package.json
COPY packages/sdk/package.json packages/sdk/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm -C packages/sdk generate
RUN pnpm -C packages/sdk build
RUN pnpm -C apps/admin build

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/apps/admin/public ./apps/admin/public
COPY --from=build /app/apps/admin/.next/standalone ./
COPY --from=build /app/apps/admin/.next/static ./apps/admin/.next/static
EXPOSE 3001
CMD ["node", "apps/admin/server.js"]
