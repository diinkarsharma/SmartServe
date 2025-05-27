# Stage 1: Install dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY smartserve-app/package*.json ./
RUN npm ci

# Stage 2: Build the application
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY smartserve-app .

RUN chmod +x node_modules/.bin/next
RUN npm run build

# Stage 3: Serve the app
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production



COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
