FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

LABEL org.opencontainers.image.source="https://github.com/0x5e/bambulab-p1screen"
LABEL org.opencontainers.image.description="Control screen software for the Bambu Lab P1 series upgrade kit."
LABEL org.opencontainers.image.licenses="MIT"

COPY package*.json ./
COPY backend/package.json ./backend/package.json
RUN npm ci --omit=dev --workspace backend --include-workspace-root=false \
  && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 8888
CMD ["node", "dist/server/index.js"]
