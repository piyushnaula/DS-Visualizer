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

# ==========================================
# STAGE 3: RUNNER (Production Image)
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user for security (Standard Best Practice)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# --- CRITICAL FOR PYODIDE ---
# We must copy the public folder because Pyodide fetches WASM files 
# from the client-side browser, so the server must serve them.
COPY --from=builder /app/public ./public

# Set permissions for the Next.js cache folder
# --- FIX IS HERE: Added 'RUN' ---
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy the standalone build output
# This contains the minimal server code needed to run the app
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to the non-root user
USER nextjs

# Expose the port
EXPOSE 3000
ENV PORT 3000

# Start the server
CMD ["node", "server.js"]