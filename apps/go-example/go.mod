module example

go 1.22.0

toolchain go1.24.3

require github.com/anthropics/executable-stories/packages/executable-stories-go v0.0.0

require (
	go.opentelemetry.io/otel v1.34.0 // indirect
	go.opentelemetry.io/otel/trace v1.34.0 // indirect
)

replace github.com/anthropics/executable-stories/packages/executable-stories-go => ../../packages/executable-stories-go
