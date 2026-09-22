# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/query .

# Final minimal runtime stage
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app
COPY --from=builder /app/query /app/query

RUN adduser -D -u 10001 appuser
USER appuser

EXPOSE 8082

ENTRYPOINT ["/app/query"]
