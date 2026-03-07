.PHONY: help quality test lint format format-check type-check security build clean check ci

help: ## Show this help message (requires: rustup component add clippy rustfmt; cargo install cargo-audit for security)
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Quality check (runs format-check, lint, security, test)
quality: format-check lint security test ## Run all quality checks

# Formatting
format: ## Format code (rewrite)
	@echo "Formatting code..."
	@cargo fmt

format-check: ## Check code is formatted (CI)
	@echo "Checking format..."
	@cargo fmt --check

# Linting and type-checking
lint: ## Run clippy (treat warnings as errors)
	@echo "Running clippy..."
	@cargo clippy --all-targets --all-features -- -D warnings

type-check: ## Type-check without building binaries
	@echo "Type-checking..."
	@cargo check --all-targets --all-features

# Testing
test: ## Run tests
	@echo "Running tests..."
	@cargo test --all-features

# Security (requires: cargo install cargo-audit)
security: ## Run security audit
	@echo "Running security audit..."
	@cargo audit

# Build
build: ## Build all targets and features
	@echo "Building..."
	@cargo build --all-targets --all-features

# Cleanup
clean: ## Remove build artifacts
	@echo "Cleaning..."
	@cargo clean

# Combined checks
check: format-check lint test ## Run format-check, lint, and test

ci: check type-check ## Run CI pipeline locally
	@echo "✓ CI pipeline passed!"
