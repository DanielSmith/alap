# Build from repo root to access the Java parser in src/other-languages/java/:
#
#   podman build -t alap-java-spring -f examples/servers/java-spring/Dockerfile .

# Stage 1: Build with Maven
FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /repo

# Copy dependency manifests first (cached unless pom.xml changes)
COPY examples/servers/java-spring/pom.xml ./examples/servers/java-spring/

WORKDIR /repo/examples/servers/java-spring
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn dependency:go-offline -B

# Copy source code (parser + server)
COPY src/other-languages/java/ /repo/src/other-languages/java/
COPY examples/servers/java-spring/src/ ./src/

# Build fat JAR
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn package -DskipTests -B && \
    cp target/alap-server-spring-*.jar /repo/app.jar && \
    echo "=== JAR built successfully ==="

# Stage 2: Runtime (downloading JRE image may take a minute on first build)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /repo/app.jar ./app.jar

EXPOSE 3000
RUN adduser -D appuser && chown -R appuser:appuser /app
USER appuser
CMD ["java", "-jar", "app.jar"]
