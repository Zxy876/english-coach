# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Stub DATABASE_URL so `prisma generate` (postinstall) + `next build` are happy.
# The real value comes from runtime env.
ENV DATABASE_URL="file:/app/prisma/dev.db"

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build Next.js application
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies for process management.
RUN apk add --no-cache dumb-init curl

# Copy package files
COPY package*.json ./

# Prisma schema must exist before production install so @prisma/client
# postinstall can generate the client during npm ci.
COPY prisma ./prisma

# Same stub for the runtime image's postinstall.
ENV DATABASE_URL="file:/app/prisma/dev.db"

# Install dependencies including prisma CLI for runtime migrations
RUN npm ci

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Set environment variables for runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Download database on start, then run
CMD ["sh", "-c", "curl -L https://github.com/Zxy876/english-coach/releases/download/db-backup-20260525/dev.db.backup.gz | gunzip -c > /app/prisma/dev.db && npx prisma generate && npm start"]
