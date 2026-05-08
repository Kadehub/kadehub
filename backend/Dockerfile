FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm cache clean --force

COPY tsconfig.json nest-cli.json ./
COPY src/ src/

RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/uploads && chown node:node /app/uploads

EXPOSE 3001

USER node

CMD ["node", "dist/main"]
