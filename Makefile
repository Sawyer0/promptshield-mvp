# Makefile for PromptShield

.PHONY: install test lint scan format help validate security deps clean build deploy

## Install dependencies
install:
	npm install

## Run all tests
test:
	npm test

## Run tests with coverage
test-coverage:
	npm run test:coverage

## Run integration tests
test-integration:
	npm run test:integration

## Run linter
lint:
	npm run lint

## Fix linting issues
lint-fix:
	npm run lint:fix

## Format code
format:
	npm run format

## Check formatting
format-check:
	npm run format:check

## Type checking
type-check:
	npm run type-check

## Full validation (type-check, lint, format, security)
validate:
	npm run validate

## Security audit
security:
	npm run security:audit

## Fix security vulnerabilities
security-fix:
	npm run security:fix

## Check for outdated dependencies
deps-check:
	npm run deps:check

## Update dependencies
deps-update:
	npm run deps:update

## Clean and reinstall dependencies
deps-clean:
	npm run deps:clean

## Build the project
build:
	npm run build

## Clean build artifacts
clean:
	npm run clean

## Example scan using sample RulePack and fixture
scan:
	node bin/promptshield scan tests/fixtures/sample.txt --rulepack rulepacks/pii.yaml

## CI/CD pipeline (runs all checks)
ci:
	npm run ci

## Prepare for release
release-prep:
	npm run ci
	npm run security:audit

## Show help
help:
	@echo "Available targets:"
	@echo "  install          Install dependencies"
	@echo "  test             Run all tests"
	@echo "  test-coverage    Run tests with coverage"
	@echo "  test-integration Run integration tests"
	@echo "  lint             Run linter"
	@echo "  lint-fix         Fix linting issues"
	@echo "  format           Format code"
	@echo "  format-check     Check formatting"
	@echo "  type-check       Type checking"
	@echo "  validate         Full validation (type-check, lint, format, security)"
	@echo "  security         Security audit"
	@echo "  security-fix     Fix security vulnerabilities"
	@echo "  deps-check       Check for outdated dependencies"
	@echo "  deps-update      Update dependencies"
	@echo "  deps-clean       Clean and reinstall dependencies"
	@echo "  build            Build the project"
	@echo "  clean            Clean build artifacts"
	@echo "  scan             Run sample scan with PII RulePack"
	@echo "  ci               Run full CI/CD pipeline"
	@echo "  release-prep     Prepare for release"
	@echo "  help             Show this help message"
