.DEFAULT_GOAL := help

.PHONY: help install lint format format-check type-check test check clean

help: ## Show this help (requires uv: https://github.com/astral-sh/uv)
	@echo "\033[1;34mAvailable commands:\033[0m"
	@grep -E '^[a-zA-Z_-]+:.*?## ' Makefile | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

VENV := .venv
ifeq ($(OS),Windows_NT)
    BIN := $(VENV)/Scripts
    UV := $(BIN)/uv.exe
else
    BIN := $(VENV)/bin
    UV := $(BIN)/uv
endif

install: ## Create venv and install with dev deps (uv venv; uv pip install -e ".[dev]")
	@echo "\033[1;32mInstalling dependencies using uv...\033[0m"
	@uv venv
	@uv pip install -e ".[dev]"
	@echo "\033[1;32mDependencies installed.\033[0m"

lint: ## Run ruff linter
	@echo "\033[1;34mRunning linter...\033[0m"
	@uv run ruff check .

format: ## Format code and fix fixable lint issues
	@echo "\033[1;34mFormatting code...\033[0m"
	@uv run ruff check --fix --unsafe-fixes .
	@uv run ruff format .

format-check: ## Check format and lint without modifying (CI)
	@echo "\033[1;34mChecking format and lint...\033[0m"
	@uv run ruff format --check .
	@uv run ruff check --no-fix .

type-check: ## Run mypy on src and tests
	@echo "\033[1;34mRunning type checker...\033[0m"
	@uv run mypy src tests

test: ## Run pytest
	@echo "\033[1;34mRunning tests...\033[0m"
	@uv run pytest

check: format-check lint type-check test ## Run format-check, lint, type-check, test

clean: ## Remove venv and cache dirs
	@echo "\033[1;34mCleaning...\033[0m"
	@rm -rf $(VENV)
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.py[co]" -delete 2>/dev/null || true
	@echo "\033[1;32mCleaned.\033[0m"
