ARG SV_IMAGE="692859926955.dkr.ecr.ap-northeast-1.amazonaws.com/stg/benchmarker:supervisor"

FROM golang:1.23 AS builder
WORKDIR /app
COPY . .
RUN go build -o /app/benchmarker -ldflags "-s -w"

FROM ${SV_IMAGE} AS supervisor

FROM gcr.io/distroless/base-debian12

WORKDIR /app
COPY --from=builder /app/benchmarker /app/benchmarker
COPY --from=supervisor /usr/local/bin/isuxportal-supervisor /app/supervisor
ENTRYPOINT ["/app/supervisor", "/app/benchmarker"]
