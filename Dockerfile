# =============================================================================
# CasualLease Production Dockerfile
# Multi-stage build optimized for Node.js 20 with pnpm
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# Install all dependencies with proper caching
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches/

# Install all dependencies (including dev for build stage)
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 2: Builder
# Build the application
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Copy source code
COPY . .

# Build the application (Vite frontend + esbuild server)
# Type check is done in CI before Docker build
RUN pnpm run build

# Prune dev dependencies after build
RUN pnpm prune --prod

# -----------------------------------------------------------------------------
# Stage 3: Production
# Minimal production image with only runtime dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production

# Install curl for health checks and dumb-init for proper signal handling
RUN apk add --no-cache curl dumb-init

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 casuallease

WORKDIR /app

# Copy production dependencies
COPY --from=builder --chown=casuallease:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=casuallease:nodejs /app/package.json ./package.json

# Copy built application
COPY --from=builder --chown=casuallease:nodejs /app/dist ./dist

# Copy drizzle migrations if needed at runtime
COPY --from=builder --chown=casuallease:nodejs /app/drizzle ./drizzle

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user
USER casuallease

# Expose application port
EXPOSE 3000

# Health check - checks the /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle PID 1 and signal forwarding
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
