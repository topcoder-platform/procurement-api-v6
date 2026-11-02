ARG NODE_VERSION=26.12.1
ARG PNPM_VERSION=11.15.1

# ---- Base Stage ----
FROM node:${NODE_VERSION}-alpine3.24@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797 AS base
ARG PNPM_VERSION
WORKDIR /usr/src/app

# ---- Dependencies Stage ----
FROM base AS deps
ARG PNPM_VERSION
RUN apk upgrade --no-cache && npm install -g pnpm@${PNPM_VERSION}
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tools ./tools
RUN pnpm install --frozen-lockfile
COPY prisma ./prisma
RUN DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public" pnpm prisma generate

# ---- Build Stage ----
FROM base AS build
ARG PNPM_VERSION
RUN apk upgrade --no-cache && npm install -g pnpm@${PNPM_VERSION}
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN pnpm exec eslint "src/**/*.ts" && pnpm test --runInBand && pnpm test:dependency-compat && pnpm build

# ---- Production Dependencies ----
FROM deps AS prod-deps
RUN pnpm prune --prod

# ---- Production Stage ----
FROM alpine:3.24@sha256:be2656061b536c1883c4034790e21d0a09c5aaaf51968b89368a3c0371ea2c9a AS production
ARG NODE_VERSION
# Alpine replaces old APK patch versions. Keep the configured Node major while
# accepting maintained patch releases and verify the selected runtime below.
RUN apk upgrade --no-cache \
    && apk add --no-cache "nodejs-current~${NODE_VERSION%%.*}" \
    && test "$(node -p 'process.versions.node.split(".")[0]')" = "${NODE_VERSION%%.*}" \
    && addgroup -g 10001 app \
    && adduser -D -u 10001 -G app -h /home/app app

ENV NODE_ENV=production \
    HOME=/home/app
WORKDIR /usr/src/app
COPY --from=build --chown=10001:10001 /usr/src/app/dist ./dist
COPY --from=prod-deps --chown=10001:10001 /usr/src/app/node_modules ./node_modules

USER app

EXPOSE 3000

CMD ["node", "dist/main.js"]
