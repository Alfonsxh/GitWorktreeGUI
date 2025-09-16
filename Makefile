# Git Worktree GUI Makefile

.PHONY: help build dev start run clean install dist dist-mac dist-win dist-linux

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm install

build: ## Build the application
	npm run build

dev: ## Start development mode with watch
	npm run dev

start: ## Start the Electron app (requires build first)
	npm start

run: build start ## Build and run the application

clean: ## Clean build artifacts
	rm -rf dist/
	rm -rf release/

dist: ## Build distribution package for current platform
	npm run dist

dist-mac: ## Build macOS distribution
	npm run dist:mac

dist-win: ## Build Windows distribution
	npm run dist:win

dist-linux: ## Build Linux distribution
	npm run dist:linux

# Default target
all: run