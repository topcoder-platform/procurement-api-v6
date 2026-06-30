# ---- Base Stage ----
FROM node:22-alpine AS base
WORKDIR /usr/src/app

# ---- Dependencies Stage ----
FROM base AS deps
RUN npm install -g pnpm@10.33.2
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY prisma ./prisma
RUN DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public" pnpm prisma generate

# ---- Build Stage ----
FROM base AS build
RUN npm install -g pnpm@10.33.2
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---- Production Dependencies ----
FROM deps AS prod-deps
RUN pnpm prune --prod

# ---- Production Stage ----
FROM base AS production
ENV NODE_ENV=production
COPY --from=build /usr/src/app/dist ./dist
COPY --from=prod-deps /usr/src/app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/main.js"]
