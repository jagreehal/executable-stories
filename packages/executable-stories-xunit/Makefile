.PHONY: help type-check format format-check lint test check clean build

.DEFAULT_GOAL := help

SLN := ExecutableStories.Xunit.sln

help: ## Show this help
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

type-check: ## Build solution (compile + analyzers)
	dotnet restore $(SLN)
	dotnet build $(SLN) --configuration Release --no-restore

format: ## Format C# with dotnet format
	dotnet format $(SLN)

format-check: ## Check format (CI)
	dotnet format $(SLN) --verify-no-changes

lint: type-check ## Lint via build (analyzers)

test: type-check ## Run tests (after build)
	dotnet test $(SLN) --configuration Release --no-build

check: format-check type-check test ## Run format-check, build, test

clean: ## Clean build artifacts
	dotnet clean $(SLN)

build: type-check ## Full build (compile; use 'make test' to run tests)
