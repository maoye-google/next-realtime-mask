# Multi-stage build for image-understanding
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and TypeScript configs
COPY . .

# Build the application
RUN npm run build

# Compile TypeScript server to JavaScript using dedicated server config
RUN npx tsc --project tsconfig.server.json

# Production stage
FROM node:20-alpine

RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy built application and dependencies
COPY --from=build /app/dist ./dist
COPY --from=build /app/build/server.js ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set ownership and permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 8080

# Start the server with dumb-init for proper signal handling
CMD ["dumb-init", "node", "server.js"]