# Build from repo root to access the Go parser in src/other-languages/go/:
#
#   docker build -t alap-gin -f examples/servers/gin-sqlite/Dockerfile .
#
# Or from the server directory with explicit context:
#
#   docker build -t alap-gin -f Dockerfile ../../..

# golang:1.25-alpine
FROM golang:1.25-alpine@sha256:8e02eb337d9e0ea459e041f1ee5eece41cbb61f1d83e7d883a3e2fb4862063fa AS builder
WORKDIR /repo

# Copy the parser package first (dependency)
COPY src/other-languages/go/ ./src/other-languages/go/

# Copy the server
COPY examples/servers/gin-sqlite/ ./examples/servers/gin-sqlite/

WORKDIR /repo/examples/servers/gin-sqlite
RUN go mod download -x
RUN CGO_ENABLED=0 go build -v -o server .
RUN CGO_ENABLED=0 go run seed.go

# alpine:3.21
FROM alpine:3.21@sha256:c3f8e73fdb79deaebaa2037150150191b9dcbfba68b4a46d70103204c53f4709
WORKDIR /app
COPY --from=builder /repo/examples/servers/gin-sqlite/server .
COPY --from=builder /repo/examples/servers/gin-sqlite/alap_configs.db .
COPY --from=builder /repo/examples/servers/gin-sqlite/public/ ./public/
EXPOSE 3000
RUN adduser -D appuser && chown appuser:appuser /app/server /app/alap_configs.db
USER appuser
CMD ["./server"]
