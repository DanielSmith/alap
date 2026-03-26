# Build from repo root to access the Go parser in src/other-languages/go/:
#
#   docker build -t alap-gin -f examples/servers/gin-sqlite/Dockerfile .
#
# Or from the server directory with explicit context:
#
#   docker build -t alap-gin -f Dockerfile ../../..

FROM golang:1.22-alpine AS builder
WORKDIR /repo

# Copy the parser package first (dependency)
COPY src/other-languages/go/ ./src/other-languages/go/

# Copy the server
COPY examples/servers/gin-sqlite/ ./examples/servers/gin-sqlite/

WORKDIR /repo/examples/servers/gin-sqlite
RUN go mod download -x
RUN CGO_ENABLED=0 go build -v -o server .
RUN CGO_ENABLED=0 go run seed.go

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /repo/examples/servers/gin-sqlite/server .
COPY --from=builder /repo/examples/servers/gin-sqlite/alap_configs.db .
COPY --from=builder /repo/examples/servers/gin-sqlite/public/ ./public/
EXPOSE 3000
CMD ["./server"]
