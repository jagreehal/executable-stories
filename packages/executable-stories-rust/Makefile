.PHONY: help quality test lint features docs format format-check type-check deny msrv build clean check ci

help: ## Show this help message (requires: cargo install cargo-hack cargo-deny)
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Quality check: what CI runs
quality: format-check lint features docs test deny msrv ## Run all quality checks

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

features: ## Run clippy for each feature on its own, and for none
	@echo "Running clippy per feature..."
	@cargo hack clippy --each-feature --all-targets -- -D warnings

docs: ## Build the API docs, failing on any warning (broken links, missing docs)
	@echo "Building docs..."
	@RUSTDOCFLAGS="-D warnings" cargo doc --no-deps --all-features

type-check: ## Type-check without building binaries
	@echo "Type-checking..."
	@cargo check --all-targets --all-features

# Testing
test: ## Run tests
	@echo "Running tests..."
	@cargo test --all-features

# Supply chain: advisories, licences, bans and sources (deny.toml)
deny: ## Check dependencies against deny.toml
	@echo "Checking dependencies..."
	@cargo deny check

msrv: ## Check the declared minimum Rust version still builds
	@echo "Checking MSRV (1.85)..."
	@cargo +1.85.0 check --all-targets --all-features
	@cargo +1.85.0 check --lib --no-default-features

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
