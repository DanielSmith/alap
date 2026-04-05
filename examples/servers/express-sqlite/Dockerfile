# Pre-req: pnpm run pack:lib   (produces dist-tgz/alap-*.tgz)
# Build:   podman build -t alap-express -f examples/servers/express-sqlite/Dockerfile .
#   or:    pnpm docker:express

FROM node:22-alpine@sha256:4d64b49e6c891c8fc821007cb1cdc6c0db7773110ac2c34bf2e6960adef62ed3
RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY dist-tgz/alap-*.tgz ./alap.tgz
COPY examples/servers/express-sqlite/package.json ./
RUN npm i -g pnpm@10.32.1 \
 && sed -i 's|"alap": "workspace:\*"|"alap": "file:./alap.tgz"|' package.json \
 && pnpm install --prod

COPY examples/servers/shared/ /shared/
COPY examples/servers/express-sqlite/server.js examples/servers/express-sqlite/seed.js ./
COPY examples/servers/express-sqlite/public/ public/
RUN node seed.js \
 && chown -R node:node /app

EXPOSE 3000

USER node
CMD ["node", "server.js"]
