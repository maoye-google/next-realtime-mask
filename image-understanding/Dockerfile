# Multi-stage build for image-understanding
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built application from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/server.ts ./
COPY --from=build /app/package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Install TypeScript for running server.ts
RUN npm install -g typescript ts-node

# Expose port 8080
EXPOSE 8080

# Start the server
CMD ["ts-node", "server.ts"]