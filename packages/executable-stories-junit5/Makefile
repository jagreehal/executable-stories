.PHONY: help compile type-check format format-check lint test check clean build

.DEFAULT_GOAL := help

help: ## Show this help
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

compile: ## Compile main and test Kotlin (type-check)
	./gradlew compileKotlin compileTestKotlin

type-check: compile ## Alias for compile

format: ## Format Kotlin with ktlint
	./gradlew ktlintFormat

format-check: ## Check format (CI)
	./gradlew ktlintCheck

lint: ## Run detekt
	./gradlew detekt

test: ## Run tests
	./gradlew test

check: format-check lint compile test ## Run format-check, lint, compile, test

clean: ## Clean build artifacts
	./gradlew clean

build: ## Full build (compile + test)
	./gradlew build
