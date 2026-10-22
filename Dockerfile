# ==========================================
# LF Online - Production Server Dockerfile
# Optimized multi-stage build for Colyseus 0.18
# Deployable to Fly.io, Render, Railway, or VPS
# ==========================================

FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@12.3.4 --activate

# Copy workspace configuration and manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/

# Install dependencies (respecting hoisted linker)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server

# Build shared simulation & server packages
RUN pnpm --filter @lf-online/shared build
RUN pnpm --filter @lf-online/server build

# ==========================================
# Production Runtime Stage
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=2567

# Copy node_modules and built packages from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/server/package.json ./packages/server/package.json
COPY --from=builder /app/packages/server/dist ./packages/server/dist

EXPOSE 2567

USER node

CMD ["node", "packages/server/dist/index.js"]
