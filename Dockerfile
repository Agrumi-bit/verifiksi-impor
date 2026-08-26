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
COPY scripts ./scripts
RUN npx prisma generate
# The region seed script skips itself once the table has rows, so it's safe to run on
# every deploy — see scripts/seed-regions.mjs.
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx scripts/seed-regions.mjs"]

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
# pdfjs-dist loads its worker file (pdf.worker.mjs) via a dynamic path Next's
# standalone-output file tracer can't see statically, so it gets pruned from
# .next/standalone/node_modules — overlay the untraced package to restore it.
COPY --from=builder /app/node_modules/pdfjs-dist ./node_modules/pdfjs-dist

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Starts as root so it can chown the mounted app_storage volume (Docker
# creates named volumes as root:root on first mount, before nextjs's uid
# ever touches it), then drops to the unprivileged nextjs user to run.
CMD ["sh", "-c", "mkdir -p /app/storage && chown -R nextjs:nodejs /app/storage && exec su -s /bin/sh -c 'exec node server.js' nextjs"]
