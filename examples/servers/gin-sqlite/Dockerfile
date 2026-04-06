# Build from repo root to access the Go parser in src/other-languages/go/:
#
#   podman build -t alap-gin -f examples/servers/gin-sqlite/Dockerfile .

# golang:1.25-alpine
FROM golang:1.25-alpine@sha256:8e02eb337d9e0ea459e041f1ee5eece41cbb61f1d83e7d883a3e2fb4862063fa AS builder
WORKDIR /repo

# 1. Copy dependency manifests first (parser + server).
#    These change rarely, so `go mod download` stays cached across code changes.
COPY src/other-languages/go/go.mod ./src/other-languages/go/
COPY examples/servers/gin-sqlite/go.mod examples/servers/gin-sqlite/go.sum ./examples/servers/gin-sqlite/

WORKDIR /repo/examples/servers/gin-sqlite
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download -x

# 2. Copy source code (parser + server).
#    Only this layer and below re-run when code changes.
COPY src/other-languages/go/ /repo/src/other-languages/go/
COPY examples/servers/gin-sqlite/ .

# 3. Build with cache mounts so recompilation is incremental.
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -v -o server .

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go run seed.go

# alpine:3.21
FROM alpine:3.21@sha256:c3f8e73fdb79deaebaa2037150150191b9dcbfba68b4a46d70103204c53f4709
WORKDIR /app
COPY --from=builder /repo/examples/servers/gin-sqlite/server .
COPY --from=builder /repo/examples/servers/gin-sqlite/alap_configs.db .
COPY --from=builder /repo/examples/servers/gin-sqlite/public/ ./public/
EXPOSE 3000
RUN adduser -D appuser && chown -R appuser:appuser /app
USER appuser
CMD ["./server"]
