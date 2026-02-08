# ==========================================
# STAGE 1: DEPS (Install Dependencies)
# ==========================================
FROM node:20-alpine AS deps
# libc6-compat might be needed for some native dependencies
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package manager files
COPY package.json package-lock.json ./ 

# Install dependencies strictly from the lockfile
RUN npm ci

# ==========================================
# STAGE 2: BUILDER (Build the Next.js App)
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from the deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy the rest of the source code
COPY . .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1

# Build the application
# This will generate the .next/standalone folder because of your config
RUN npm run build

# ... (Previous stages remain the same) ...

# ==========================================
# STAGE 3: RUNNER (Production Image)
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 👇 ADD THIS LINE (Fixes the 404 Not Found error)
ENV HOSTNAME="0.0.0.0"

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public folder
COPY --from=builder /app/public ./public

# Set permissions
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy the build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]