# Mono-Repo Folder Structure

```
cafeteria-ordering-system/
├── docker-compose.yml                 # Main orchestration file
├── docker-compose.override.yml        # Local development overrides
├── .env.example                       # Environment variables template
├── .gitignore
├── README.md
├── ARCHITECTURE.md
├── Makefile                           # Common commands (make up, make logs, etc.)
│
├── services/                          # Microservices
│   ├── identity-provider/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.js              # Entry point
│   │   │   ├── config/
│   │   │   │   ├── database.js
│   │   │   │   ├── jwt.js
│   │   │   │   └── redis.js
│   │   │   ├── controllers/
│   │   │   │   ├── auth.controller.js
│   │   │   │   └── user.controller.js
│   │   │   ├── middleware/
│   │   │   │   ├── rateLimiter.js
│   │   │   │   ├── validator.js
│   │   │   │   └── errorHandler.js
│   │   │   ├── models/
│   │   │   │   └── user.model.js
│   │   │   ├── routes/
│   │   │   │   └── auth.routes.js
│   │   │   ├── services/
│   │   │   │   ├── jwt.service.js
│   │   │   │   └── password.service.js
│   │   │   └── utils/
│   │   │       ├── logger.js
│   │   │       └── metrics.js
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   └── integration/
│   │   └── .dockerignore
│   │
│   ├── order-gateway/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── config/
│   │   │   │   ├── cache.js
│   │   │   │   ├── services.js       # Service URLs
│   │   │   │   └── rabbitmq.js
│   │   │   ├── controllers/
│   │   │   │   ├── order.controller.js
│   │   │   │   └── menu.controller.js
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.js
│   │   │   │   ├── cache.middleware.js
│   │   │   │   ├── idempotency.middleware.js
│   │   │   │   ├── rateLimiter.js
│   │   │   │   └── circuitBreaker.js
│   │   │   ├── routes/
│   │   │   │   ├── order.routes.js
│   │   │   │   └── health.routes.js
│   │   │   ├── services/
│   │   │   │   ├── stock.client.js   # HTTP client for Stock Service
│   │   │   │   ├── cache.service.js
│   │   │   │   └── publisher.service.js
│   │   │   └── utils/
│   │   │       ├── logger.js
│   │   │       └── metrics.js
│   │   ├── tests/
│   │   └── .dockerignore
│   │
│   ├── stock-service/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── config/
│   │   │   │   ├── database.js
│   │   │   │   └── rabbitmq.js
│   │   │   ├── controllers/
│   │   │   │   ├── stock.controller.js
│   │   │   │   └── inventory.controller.js
│   │   │   ├── middleware/
│   │   │   │   ├── internalAuth.js   # Service-to-service auth
│   │   │   │   └── errorHandler.js
│   │   │   ├── models/
│   │   │   │   └── inventory.model.js
│   │   │   ├── routes/
│   │   │   │   ├── internal.routes.js # Internal APIs
│   │   │   │   └── admin.routes.js    # Admin APIs
│   │   │   ├── services/
│   │   │   │   ├── reservation.service.js
│   │   │   │   ├── optimisticLock.service.js
│   │   │   │   └── publisher.service.js
│   │   │   └── utils/
│   │   │       ├── logger.js
│   │   │       └── metrics.js
│   │   ├── migrations/
│   │   │   └── 001_create_inventory.sql
│   │   ├── tests/
│   │   └── .dockerignore
│   │
│   ├── kitchen-queue/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── config/
│   │   │   │   ├── database.js
│   │   │   │   └── rabbitmq.js
│   │   │   ├── consumers/
│   │   │   │   ├── orderCreated.consumer.js
│   │   │   │   └── orderCancelled.consumer.js
│   │   │   ├── services/
│   │   │   │   ├── cooking.service.js
│   │   │   │   ├── order.service.js
│   │   │   │   └── publisher.service.js
│   │   │   ├── workers/
│   │   │   │   └── cookingSimulator.js
│   │   │   └── utils/
│   │   │       ├── logger.js
│   │   │       └── metrics.js
│   │   ├── tests/
│   │   └── .dockerignore
│   │
│   └── notification-hub/
│       ├── Dockerfile
│       ├── package.json
│       ├── src/
│       │   ├── index.js
│       │   ├── config/
│       │   │   ├── websocket.js
│       │   │   └── rabbitmq.js
│       │   ├── consumers/
│       │   │   ├── orderCompleted.consumer.js
│       │   │   └── orderStatusChanged.consumer.js
│       │   ├── services/
│       │   │   ├── websocket.service.js
│       │   │   └── notification.service.js
│       │   └── utils/
│       │       ├── logger.js
│       │       └── metrics.js
│       ├── tests/
│       └── .dockerignore
│
├── infrastructure/                    # Infrastructure configs
│   ├── nginx/
│   │   ├── Dockerfile
│   │   ├── nginx.conf
│   │   └── conf.d/
│   │       ├── default.conf
│   │       └── upstream.conf
│   │
│   ├── postgres/
│   │   ├── init-scripts/
│   │   │   ├── 01-create-databases.sql
│   │   │   ├── 02-create-users.sql
│   │   │   └── 03-seed-data.sql
│   │   └── postgresql.conf
│   │
│   ├── rabbitmq/
│   │   ├── Dockerfile
│   │   ├── rabbitmq.conf
│   │   └── definitions.json          # Queue/exchange definitions
│   │
│   ├── redis/
│   │   └── redis.conf
│   │
│   └── prometheus/
│       ├── prometheus.yml
│       └── alerts.yml
│
├── shared/                            # Shared libraries
│   ├── logger/
│   │   ├── package.json
│   │   └── index.js
│   ├── metrics/
│   │   ├── package.json
│   │   └── index.js
│   └── types/
│       ├── package.json
│       └── index.d.ts
│
├── scripts/                           # Utility scripts
│   ├── seed-data.js
│   ├── generate-jwt-keys.sh
│   ├── health-check.sh
│   └── load-test.js
│
├── docs/                              # Documentation
│   ├── API.md                         # API documentation
│   ├── DEPLOYMENT.md
│   ├── MONITORING.md
│   └── TROUBLESHOOTING.md
│
└── monitoring/                        # Observability configs
    ├── grafana/
    │   ├── dashboards/
    │   │   ├── system-overview.json
    │   │   ├── order-metrics.json
    │   │   └── stock-metrics.json
    │   └── provisioning/
    │       ├── datasources/
    │       └── dashboards/
    │
    └── jaeger/
        └── jaeger-config.yml
```

## Key Design Decisions

### 1. Service Independence
Each service has its own:
- Dockerfile (optimized for that service)
- package.json (independent dependencies)
- Database schema (if needed)
- Test suite

### 2. Shared Code
Common utilities (logger, metrics) are in `shared/` and can be:
- Symlinked during development
- Copied during Docker build
- Published as internal npm packages (production)

### 3. Configuration Management
- `.env.example` for environment variables
- Service-specific configs in `src/config/`
- Infrastructure configs in `infrastructure/`

### 4. Database Strategy
- Single PostgreSQL instance with multiple databases:
  - `identity_db` (users, sessions)
  - `orders_db` (orders, order_items)
  - `inventory_db` (stock, menu_items)
- Init scripts in `infrastructure/postgres/init-scripts/`

### 5. Testing Strategy
- Unit tests: `services/*/tests/unit/`
- Integration tests: `services/*/tests/integration/`
- E2E tests: Root level `tests/e2e/`
- Load tests: `scripts/load-test.js`

### 6. Monitoring & Observability
- Prometheus scrapes `/metrics` from each service
- Grafana dashboards pre-configured
- Jaeger for distributed tracing
- Centralized logging (stdout → Docker logs → ELK)

## File Naming Conventions

- Controllers: `*.controller.js`
- Services: `*.service.js`
- Models: `*.model.js`
- Routes: `*.routes.js`
- Middleware: `*.middleware.js` or descriptive names
- Consumers: `*.consumer.js`
- Tests: `*.test.js` or `*.spec.js`
- Config: `*.config.js` or descriptive names

## Docker Build Optimization

Each Dockerfile follows:
1. Multi-stage builds (builder → production)
2. Layer caching (copy package.json first)
3. Non-root user
4. Health checks
5. Minimal base image (node:20-alpine)
