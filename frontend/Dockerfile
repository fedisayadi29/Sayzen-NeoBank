# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Install serve to run the app
RUN npm install -g serve

COPY --from=builder --chown=nodejs:nodejs /app/build ./build

ENV NODE_ENV=production
ENV BROWSER=none

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

USER nodejs

CMD ["serve", "-s", "build", "-l", "3000"]
