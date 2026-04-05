# Pre-req: pnpm run pack:lib   (produces dist-tgz/alap-*.tgz)
# Build:   podman build -t alap-bun -f examples/servers/bun-sqlite/Dockerfile .
#   or:    pnpm docker:bun

FROM oven/bun:1-alpine@sha256:7ed9f74c326d1c260abe247ac423ccbf5ac92af62bb442d515d1f92f21e8ea9b
WORKDIR /app

COPY dist-tgz/alap-*.tgz ./alap.tgz
COPY examples/servers/bun-sqlite/package.json ./
RUN sed -i 's|"alap": "workspace:\*"|"alap": "file:./alap.tgz"|' package.json \
 && bun install --production

COPY examples/servers/shared/ /shared/
COPY examples/servers/bun-sqlite/server.ts examples/servers/bun-sqlite/seed.ts ./
COPY examples/servers/bun-sqlite/public/ public/
RUN bun run seed.ts \
 && chown -R bun:bun /app

EXPOSE 3000

USER bun
CMD ["bun", "run", "server.ts"]
