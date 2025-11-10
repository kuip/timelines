.PHONY: help setup db-setup backend frontend clean

help:
	@echo "Timeline Application - Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make setup      - Complete project setup (database + dependencies)"
	@echo "  make db-setup   - Initialize database and run migrations"
	@echo ""
	@echo "Development:"
	@echo "  make backend    - Run backend server"
	@echo "  make frontend   - Run frontend dev server"
	@echo "  make dev        - Run both backend and frontend (requires tmux)"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean      - Clean build artifacts"
	@echo ""

setup: db-setup
	@echo "Installing backend dependencies..."
	cd backend && go mod download
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo ""
	@echo "Setup complete! Run 'make dev' to start development."

db-setup:
	@echo "Setting up database..."
	cd backend/migrations && chmod +x setup.sh && ./setup.sh

backend:
	@echo "Starting backend server..."
	cd backend && go run cmd/server/main.go

frontend:
	@echo "Starting frontend dev server..."
	cd frontend && npm run dev

dev:
	@echo "Starting backend and frontend..."
	@tmux new-session -d -s timeline 'cd backend && go run cmd/server/main.go' \; \
		split-window -h 'cd frontend && npm run dev' \; \
		attach-session -t timeline

clean:
	@echo "Cleaning build artifacts..."
	cd backend && go clean
	cd frontend && rm -rf .next node_modules/.cache
	@echo "Clean complete!"
