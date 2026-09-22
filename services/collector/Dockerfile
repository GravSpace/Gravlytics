# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build binary with optimizations
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/collector .

# Final minimal runtime stage
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app
COPY --from=builder /app/collector /app/collector

# Non-root user for security
RUN adduser -D -u 10001 appuser
USER appuser

EXPOSE 8081

ENTRYPOINT ["/app/collector"]
