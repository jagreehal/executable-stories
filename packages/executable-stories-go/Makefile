.PHONY: help quality test lint format tidy security coverage build clean check ci

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Quality check (runs format, lint, security, test)
quality: format lint security test ## Run all quality checks

# Testing
test: ## Run tests
	@echo "Running tests..."
	@go test -v ./...

coverage: ## Run tests with coverage report
	@echo "Running tests with coverage..."
	@go test -coverprofile=coverage.out ./...
	@go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# Linting and formatting
lint: ## Run linters
	@echo "Running linters..."
	@golangci-lint run

format: ## Format code
	@echo "Formatting code..."
	@gofmt -w .
	@goimports -w .

# Dependency management
tidy: ## Tidy go.mod
	@echo "Tidying go.mod..."
	@go mod tidy

# Security scanning (G301/G306 excluded: report dir/file perms intentional for CI/consumers)
security: ## Run security scanner
	@echo "Running security scanner..."
	@gosec -exclude=G301,G306 ./...

# Build (verify package compiles)
build: ## Build / verify package compiles
	@echo "Building..."
	@go build ./...

# Cleanup
clean: ## Clean build artifacts
	@echo "Cleaning..."
	@rm -rf coverage.out coverage.html

# Combined checks
check: format lint test ## Run format, lint, and test

ci: check build ## Run CI pipeline locally
	@echo "✓ CI pipeline passed!"
