# Build from repo root:
#
#   docker build -t alap-hono -f examples/servers/hono-sqlite/Dockerfile .

# node:22-alpine
FROM node:22-alpine@sha256:4d64b49e6c891c8fc821007cb1cdc6c0db7773110ac2c34bf2e6960adef62ed3 AS lib
WORKDIR /lib
COPY package.json pnpm-lock.yaml ./
COPY src/ src/
COPY vite.config.ts vite.config.iife.ts tsconfig.json tsconfig.solid.json ./
RUN npm i -g pnpm@10.32.1 && pnpm install && pnpm build && pnpm pack

# node:22-alpine
FROM node:22-alpine@sha256:4d64b49e6c891c8fc821007cb1cdc6c0db7773110ac2c34bf2e6960adef62ed3
WORKDIR /app

COPY examples/servers/hono-sqlite/package.json ./
COPY --from=lib /lib/alap-*.tgz ./alap.tgz
RUN sed -i 's|"alap": "file:../../.."|"alap": "file:./alap.tgz"|' package.json \
 && npm install --production

COPY examples/servers/shared/ /shared/
COPY examples/servers/hono-sqlite/server.js examples/servers/hono-sqlite/seed.js ./
COPY examples/servers/hono-sqlite/public/ public/
RUN node seed.js

EXPOSE 3000

USER node
CMD ["node", "server.js"]
