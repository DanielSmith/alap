# Build from repo root:
#
#   docker build -t alap-bun -f examples/servers/bun-sqlite/Dockerfile .

# node:22-alpine
FROM node:22-alpine@sha256:4d64b49e6c891c8fc821007cb1cdc6c0db7773110ac2c34bf2e6960adef62ed3 AS lib
WORKDIR /lib
COPY package.json pnpm-lock.yaml ./
COPY src/ src/
COPY vite.config.ts vite.config.iife.ts tsconfig.json tsconfig.solid.json ./
RUN npm i -g pnpm@10.32.1 && pnpm install && pnpm build && pnpm pack

# oven/bun:1-alpine
FROM oven/bun:1-alpine@sha256:7ed9f74c326d1c260abe247ac423ccbf5ac92af62bb442d515d1f92f21e8ea9b
WORKDIR /app

COPY examples/servers/bun-sqlite/package.json ./
COPY --from=lib /lib/alap-*.tgz ./alap.tgz
RUN sed -i 's|"alap": "file:../../.."|"alap": "file:./alap.tgz"|' package.json \
 && bun install --production

COPY examples/servers/shared/ /shared/
COPY examples/servers/bun-sqlite/server.ts examples/servers/bun-sqlite/seed.ts ./
COPY examples/servers/bun-sqlite/public/ public/
RUN bun run seed.ts

EXPOSE 3000

USER bun
CMD ["bun", "run", "server.ts"]
