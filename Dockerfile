# Stage 1: Development
FROM node:20-alpine AS development

# Install dependencies for node-gyp and other build tools
RUN apk add --no-cache python3 make g++ git

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm install

# Copy source
COPY . .

# Stage 2: Production build
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source from development stage
COPY --from=development /usr/src/app/src ./src
COPY --from=development /usr/src/app/config ./config

# Stage 3: Production
FROM node:20-alpine AS production

# Install necessary runtime packages
RUN apk add --no-cache tini

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

WORKDIR /usr/src/app

# Copy built application
COPY --from=builder /usr/src/app ./
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Create necessary directories and set permissions
RUN mkdir -p logs && \
    chown -R nodejs:nodejs /usr/src/app

# Switch to non-root user
USER nodejs

# Use tini as entrypoint
ENTRYPOINT ["/sbin/tini", "--"]

# Default command
CMD ["node", "src/app.js"] 