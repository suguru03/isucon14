package metrics

import (
	"context"
	"os"
	"time"

	"github.com/isucon/isucon14/bench/benchrun"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
	"go.opentelemetry.io/otel/exporters/stdout/stdoutmetric"
	"go.opentelemetry.io/otel/metric"
	metricsdk "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	semconv "go.opentelemetry.io/otel/semconv/v1.20.0"
)

func NewMeter(ctx context.Context) (metric.Meter, metricsdk.Exporter, error) {
	exp, err := getExporter()
	if err != nil {
		return nil, nil, err
	}

	recources, err := resource.New(
		ctx,
		resource.WithProcessCommandArgs(),
		resource.WithHost(),
		resource.WithAttributes(
			semconv.ServiceName("isucon14_benchmarker"),
			attribute.String("target", benchrun.GetTargetAddress()),
		),
	)
	if err != nil {
		return nil, nil, err
	}

	reader := metricsdk.NewPeriodicReader(exp, metricsdk.WithInterval(3*time.Second))

	provider := metricsdk.NewMeterProvider(
		metricsdk.WithResource(recources),
		metricsdk.WithReader(reader),
	)
	otel.SetMeterProvider(provider)

	return otel.Meter("isucon14_benchmarker"), exp, nil
}

func getExporter() (metricsdk.Exporter, error) {
	if os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT") != "" {
		return otlpmetrichttp.New(context.Background())
	}
	return stdoutmetric.New(stdoutmetric.WithWriter(os.Stderr))
}
