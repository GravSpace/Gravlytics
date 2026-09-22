# Production Dockerfile for SvelteKit on Bun
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
RUN bun install

# Copy application source
COPY . .

# Build SvelteKit application
ENV NODE_ENV=production
RUN bun run build

# Runtime stage
FROM oven/bun:1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.svelte-kit ./.svelte-kit
COPY --from=builder /app/build ./build

# Non-root user
USER bun

EXPOSE 3000

CMD ["bun", "run", "preview", "--host", "0.0.0.0", "--port", "3000"]
