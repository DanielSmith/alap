# Build from repo root:
#
#   docker build -t alap-bun -f examples/servers/bun-sqlite/Dockerfile .

FROM node:20-alpine AS lib
WORKDIR /lib
COPY package.json pnpm-lock.yaml ./
COPY src/ src/
COPY vite.config.ts vite.config.iife.ts tsconfig.json tsconfig.solid.json ./
RUN npm i -g pnpm && pnpm install && pnpm build && pnpm pack

FROM oven/bun:1-alpine
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

CMD ["bun", "run", "server.ts"]
