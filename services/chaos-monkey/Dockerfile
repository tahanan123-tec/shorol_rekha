# Multi-stage build
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runner
WORKDIR /app

# Install stress-ng and iptables for chaos experiments
RUN apk add --no-cache stress-ng iptables iproute2

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3006

CMD ["node", "src/index.js"]
