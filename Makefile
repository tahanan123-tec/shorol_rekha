.PHONY: help up down logs clean build test seed health

help:
	@echo "Cafeteria Ordering System - Available Commands:"
	@echo "  make up          - Start all services"
	@echo "  make down        - Stop all services"
	@echo "  make logs        - View logs from all services"
	@echo "  make clean       - Remove all containers, volumes, and networks"
	@echo "  make build       - Build all Docker images"
	@echo "  make test        - Run all tests"
	@echo "  make seed        - Seed database with sample data"
	@echo "  make health      - Check health of all services"
	@echo "  make keys        - Generate JWT keys"

up:
	@echo "Starting all services..."
	docker-compose up -d
	@echo "Services started. Access:"
	@echo "  - API Gateway: http://localhost"
	@echo "  - RabbitMQ UI: http://localhost:15672"
	@echo "  - Grafana: http://localhost:3000"
	@echo "  - Prometheus: http://localhost:9090"
	@echo "  - Jaeger: http://localhost:16686"

down:
	@echo "Stopping all services..."
	docker-compose down

logs:
	docker-compose logs -f

clean:
	@echo "Cleaning up..."
	docker-compose down -v --remove-orphans
	docker system prune -f

build:
	@echo "Building all images..."
	docker-compose build --parallel

test:
	@echo "Running tests..."
	docker-compose run --rm order-gateway npm test
	docker-compose run --rm stock-service npm test
	docker-compose run --rm kitchen-queue npm test

seed:
	@echo "Seeding database..."
	node scripts/seed-data.js

health:
	@echo "Checking service health..."
	./scripts/health-check.sh

keys:
	@echo "Generating JWT keys..."
	./scripts/generate-jwt-keys.sh
