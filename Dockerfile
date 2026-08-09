FROM node:22-bookworm-slim AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS migrator
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
CMD ["npx", "prisma", "migrate", "deploy"]

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Starts as root so it can chown the mounted app_storage volume (Docker
# creates named volumes as root:root on first mount, before nextjs's uid
# ever touches it), then drops to the unprivileged nextjs user to run.
CMD ["sh", "-c", "mkdir -p /app/storage && chown -R nextjs:nodejs /app/storage && exec su -s /bin/sh -c 'exec node server.js' nextjs"]
