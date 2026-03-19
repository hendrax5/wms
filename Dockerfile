FROM node:20-alpine AS base

# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ─── Stage 2: Build the Next.js app ──────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client before build
RUN npx prisma generate

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Build the app (standalone output configured in next.config.ts)
RUN npm run build

# ─── Stage 3: Production runner ──────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install openssl for prisma at runtime
RUN apk add --no-cache openssl

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Create .next dir with correct permissions
RUN mkdir .next && chown nextjs:nodejs .next

# Copy standalone build artifacts
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static

# Copy Prisma schema + generated client + migrations (needed for migrate deploy)
COPY --from=builder --chown=nextjs:nodejs /app/prisma                ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma  ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma  ./node_modules/@prisma
# Copy prisma CLI + its peer dependency 'effect' (required by @prisma/config in Prisma v6+)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma   ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/effect   ./node_modules/effect

# Copy fix scripts
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
# Copy seed script + its runtime dependency (bcryptjs)
COPY --from=builder --chown=nextjs:nodejs /app/prisma/seed.js  ./prisma/seed.js
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs

# Copy entrypoint script
# Fix Windows CRLF line endings in-place with sed (no extra package needed)
COPY --chown=nextjs:nodejs entrypoint.sh ./entrypoint.sh
USER root
RUN sed -i 's/\r//' ./entrypoint.sh && chmod +x ./entrypoint.sh
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run migrations then start server
CMD ["sh", "entrypoint.sh"]
