# syntax=docker/dockerfile:1
# Production image of the Next.js app (standalone output). Supabase runs separately:
# locally via `supabase start`, in production as a hosted project.

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# 1. Dependencies — cached until package-lock.json changes
FROM base AS deps
COPY package.json package-lock.json ./
# HUSKY=0: git hooks are for developers, there is no .git in the image
RUN HUSKY=0 npm ci

# 2. Build — NEXT_PUBLIC_* values are inlined into the browser bundle, so they are build args.
# Secrets are NOT build args: they are read at runtime from the container environment.
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build

# 3. Runtime — only the traced server files, static assets and public/
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/offline > /dev/null || exit 1
CMD ["node", "server.js"]
