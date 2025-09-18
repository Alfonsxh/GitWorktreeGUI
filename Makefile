# Git Worktree GUI Makefile

# Environment variables for Electron mirror (China friendly)
ELECTRON_ENV = ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
ELECTRON_PUBLISH_ARGS ?= --publish never
ELECTRON_BUILDER ?= $(ELECTRON_ENV) CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder $(ELECTRON_PUBLISH_ARGS)
DIST_ARGS ?=
DIST_MAC_ARGS ?=
DIST_WIN_ARGS ?=
DIST_LINUX_ARGS ?=

.PHONY: help build dev start run clean install dist dist-mac dist-win dist-linux
.PHONY: setup rebuild clean-install build-prod package test-package release

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Basic commands
install: ## Install dependencies
	$(ELECTRON_ENV) npm install

build: ## Build the application (development)
	npx webpack --config webpack.config.js --mode development

build-prod: ## Build the application (production)
	npx webpack --config webpack.config.js --mode production

dev: ## Start development mode with watch
	npm run dev

start: ## Start the Electron app (requires build first)
	npm start

run: build start ## Build and run the application

# Cleaning commands
clean: ## Clean build artifacts
	rm -rf dist/
	rm -rf release/

deep-clean: clean ## Deep clean including node_modules
	rm -rf node_modules/
	rm -f package-lock.json

# Setup and rebuild commands
setup: ## Complete setup with rebuild
	@echo "Setting up project..."
	$(MAKE) deep-clean
	$(MAKE) install
	$(MAKE) rebuild
	@echo "Setup complete!"

rebuild: ## Rebuild native modules for Electron
	npx electron-rebuild

clean-install: ## Clean install with rebuild
	$(MAKE) deep-clean
	$(MAKE) install
	$(MAKE) rebuild

# Distribution commands
dist: build-prod ## Build distribution package for current platform
	$(ELECTRON_BUILDER) $(DIST_ARGS)

dist-mac: build-prod ## Build macOS distribution
	$(ELECTRON_BUILDER) --mac $(DIST_MAC_ARGS)

dist-win: build-prod ## Build Windows distribution
	$(ELECTRON_BUILDER) --win $(DIST_WIN_ARGS)

dist-linux: build-prod ## Build Linux distribution
	$(ELECTRON_BUILDER) --linux $(DIST_LINUX_ARGS)

# Complete packaging workflow
package: ## Complete packaging workflow (clean, install, build, test)
	@echo "Starting complete packaging workflow..."
	$(MAKE) deep-clean
	@echo "Installing dependencies..."
	$(ELECTRON_ENV) npm install
	@echo "Rebuilding native modules..."
	$(MAKE) rebuild
	@echo "Building production version..."
	$(MAKE) build-prod
	@echo "Testing application..."
	npm start &
	@sleep 5
	@pkill -f electron || true
	@echo "Creating distribution packages..."
	$(MAKE) dist
	@echo "Packaging complete! Check the release/ directory."

# Testing commands
test-package: ## Test the built application
	npm start &
	@sleep 5
	@pkill -f electron || true
	@echo "Application test completed"

# Quick commands for development
quick-start: ## Quick start (assumes dependencies installed)
	$(MAKE) build
	$(MAKE) start

quick-rebuild: ## Quick rebuild and start
	$(MAKE) rebuild
	$(MAKE) build
	$(MAKE) start

# Release workflow
release: ## Full release workflow (for all platforms)
	@echo "Building release for all platforms..."
	$(MAKE) package
	@echo ""
	@echo "Release builds created in ./release/"
	@echo "Don't forget to:"
	@echo "  1. Update version in package.json"
	@echo "  2. Create git tag: git tag -a v1.0.0 -m 'Release v1.0.0'"
	@echo "  3. Push tag: git push origin v1.0.0"
	@echo "  4. Upload builds to GitHub Releases"

# Troubleshooting commands
fix-electron: ## Fix Electron installation issues
	cd node_modules/electron && $(ELECTRON_ENV) node install.js

fix-modules: ## Fix native module issues
	$(MAKE) rebuild

check-deps: ## Check for dependency issues
	npm ls --depth=0 | grep -E "extraneous|UNMET" || echo "No dependency issues found"

# Default target
all: run
