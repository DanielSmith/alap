# Build from repo root to access the Rust parser in src/other-languages/rust/:
#
#   docker build -t alap-axum -f examples/servers/axum-sqlite/Dockerfile .
#
# Or from the server directory with explicit context:
#
#   docker build -t alap-axum -f Dockerfile ../../..

FROM rust:1.85-alpine AS builder
RUN apk add --no-cache musl-dev
WORKDIR /repo

# Copy the parser crate first (dependency)
COPY src/other-languages/rust/ ./src/other-languages/rust/

# Copy the server
COPY examples/servers/axum-sqlite/ ./examples/servers/axum-sqlite/

WORKDIR /repo/examples/servers/axum-sqlite

# Cache mounts keep cargo registry and target/ across builds.
# After a code change, only the changed crate recompiles — dependencies stay cached.
# The cp trick: cache mounts vanish after RUN, so copy artifacts to a stable path.
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/repo/examples/servers/axum-sqlite/target \
    cargo build -j 2 --release && \
    cp target/release/server /repo/server-bin

RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/repo/examples/servers/axum-sqlite/target \
    cargo run -j 2 --release --bin seed && \
    cp alap.db /repo/alap.db

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /repo/server-bin ./server
COPY --from=builder /repo/alap.db .
COPY --from=builder /repo/examples/servers/axum-sqlite/public/ ./public/
EXPOSE 3000
CMD ["./server"]
