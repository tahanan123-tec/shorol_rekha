# University Cafeteria Ordering System - Microservices Architecture

## System Overview

A distributed microservices architecture designed to handle extreme traffic spikes during Ramadan iftar ordering, with sub-2-second order acknowledgment and resilient failure handling.

## Architecture Diagram (Text Form)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Load Balancer (Nginx)                       │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
         ┌──────────▼──────────┐   ┌─────────▼──────────┐
         │  Identity Provider  │   │   Order Gateway     │
         │  (Auth Service)     │   │   (API Gateway)     │
         │  - JWT Generation   │◄──│   - Token Validation│
         │  - Rate Limiting    │   │   - Cache Check     │
         │  - User Management  │   │   - Request Routing │
         └─────────────────────┘   └──────────┬──────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
         ┌──────────▼──────────┐   ┌─────────▼──────────┐   ┌─────────▼──────────┐
         │   Stock Service     │   │  Kitchen Queue      │   │  Notification Hub   │
         │  - Inventory Mgmt   │   │  - Order Processing │   │  - WebSocket Server │
         │  - Optimistic Lock  │   │  - Async Cooking    │   │  - Push Notifications│
         │  - Concurrency Ctrl │   │  - Status Updates   │   │  - Real-time Updates│
         └──────────┬──────────┘   └──────────┬──────────┘   └─────────────────────┘
                    │                         │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Message Broker        │
                    │   (RabbitMQ)            │
                    │   - order.created       │
                    │   - order.processing    │
                    │   - order.completed     │
                    │   - stock.updated       │
                    └─────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        Shared Infrastructure                         │
├─────────────────────────────────────────────────────────────────────┤
│  Redis Cluster        │  PostgreSQL (Primary)  │  Prometheus         │
│  - Cache              │  - Orders DB           │  - Metrics          │
│  - Session Store      │  - Users DB            │  - Monitoring       │
│  - Rate Limit Counter │  - Inventory DB        │                     │
├─────────────────────────────────────────────────────────────────────┤
│  Grafana              │  Jaeger                │  ELK Stack          │
│  - Dashboards         │  - Distributed Tracing │  - Log Aggregation  │
└─────────────────────────────────────────────────────────────────────┘
```

## Tech Stack Recommendation

### Core Services
- **Language**: Node.js (Express/Fastify) for high concurrency
- **Alternative**: Go for Stock Service (better concurrency primitives)

### Infrastructure
- **Container Orchestration**: Docker Compose (dev/staging), Kubernetes-ready
- **API Gateway**: Nginx + Custom Node.js Gateway
- **Message Broker**: RabbitMQ (easier ops than Kafka for this scale)
- **Cache**: Redis Cluster (persistence enabled)
- **Database**: PostgreSQL 15+ (JSONB support, row-level locking)
- **Authentication**: JWT with RS256 (asymmetric keys)

### Observability
- **Metrics**: Prometheus + Grafana
- **Tracing**: Jaeger (OpenTelemetry compatible)
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Health Checks**: Custom /health and /ready endpoints

### Communication
- **Sync**: REST APIs (JSON)
- **Async**: RabbitMQ with topic exchanges
- **Real-time**: WebSocket (Socket.io)

## Service Interaction Flow

### 1. User Authentication Flow
```
Client → Identity Provider
  ├─ POST /auth/register (email, password, student_id)
  ├─ POST /auth/login → JWT Token (15min access, 7d refresh)
  └─ POST /auth/refresh → New Access Token
```

### 2. Order Creation Flow (Happy Path)
```
1. Client → Order Gateway
   POST /api/orders
   Headers: Authorization: Bearer <JWT>
   Body: { items: [{id, quantity}], delivery_time: "18:30" }

2. Order Gateway validates:
   ├─ JWT signature and expiry
   ├─ Rate limit check (Redis: 10 orders/min per user)
   └─ Idempotency key (Redis: idempotency:{key})

3. Order Gateway → Stock Service
   POST /internal/stock/reserve
   Body: { order_id, items: [{id, quantity}] }
   
4. Stock Service (Optimistic Locking):
   BEGIN TRANSACTION
   ├─ SELECT * FROM inventory WHERE id IN (...) FOR UPDATE NOWAIT
   ├─ Check availability
   ├─ UPDATE inventory SET quantity = quantity - X, version = version + 1
   │  WHERE id = ? AND version = ?
   └─ COMMIT or ROLLBACK

5. If stock reserved:
   ├─ Order Gateway saves order (status: PENDING)
   ├─ Publishes to RabbitMQ: order.created
   └─ Returns 202 Accepted { order_id, status: "PENDING", eta: "18:35" }

6. Kitchen Queue (Async Consumer):
   ├─ Consumes order.created event
   ├─ Simulates cooking (3-7s delay)
   ├─ Updates order status: PROCESSING → READY
   └─ Publishes: order.completed

7. Notification Hub:
   ├─ Consumes order.completed
   └─ Sends WebSocket push: { order_id, status: "READY" }
```

### 3. Cache Strategy
```
Order Gateway caches:
├─ Menu items (TTL: 5 minutes)
├─ User profiles (TTL: 10 minutes)
└─ Stock availability (TTL: 30 seconds)

Cache invalidation:
├─ Stock updates → Publish stock.updated → Gateway invalidates cache
└─ Menu changes → Admin API → Invalidate menu cache
```

## Failure Scenarios & Mitigation

### Scenario 1: Stock Service Down
**Impact**: Cannot reserve inventory
**Mitigation**:
- Circuit breaker in Order Gateway (fail after 3 consecutive failures)
- Fallback: Queue orders in "PENDING_STOCK" state
- Background job retries stock reservation when service recovers
- User sees: "Order queued, confirmation pending"

### Scenario 2: RabbitMQ Down
**Impact**: Async processing stops
**Mitigation**:
- Orders saved in DB with status PENDING
- RabbitMQ persistence enabled (durable queues)
- On recovery, republish pending orders from DB
- Kitchen Queue polls DB as fallback (every 10s)

### Scenario 3: Redis Cache Down
**Impact**: Performance degradation, rate limiting fails
**Mitigation**:
- Services continue without cache (direct DB queries)
- Rate limiting falls back to in-memory (per-instance)
- Health check reports degraded state
- Auto-restart Redis container

### Scenario 4: Database Connection Pool Exhausted
**Impact**: Cannot process new orders
**Mitigation**:
- Connection pool limits: min=10, max=50
- Queue requests with timeout (5s)
- Return 503 Service Unavailable with Retry-After header
- Horizontal scaling triggers (CPU > 70%)

### Scenario 5: Extreme Traffic Spike (Iftar Rush)
**Impact**: System overload
**Mitigation**:
- Rate limiting: 10 orders/min per user, 1000 orders/min global
- Redis-based distributed rate limiter
- Queue overflow protection (max queue size: 10,000)
- Auto-scaling based on queue depth
- Graceful degradation: Disable non-critical features (recommendations)

### Scenario 6: Kitchen Queue Processing Delay
**Impact**: Orders stuck in PENDING
**Mitigation**:
- Dead letter queue for failed orders (after 3 retries)
- Monitoring alert if queue depth > 100
- Manual intervention dashboard
- Timeout mechanism: Auto-cancel after 30 minutes

## Idempotency Handling

```javascript
// Order Gateway - Idempotency Middleware
const idempotencyKey = req.headers['idempotency-key'] || generateKey();
const cached = await redis.get(`idempotency:${idempotencyKey}`);

if (cached) {
  return res.status(200).json(JSON.parse(cached));
}

// Process order...
const result = await processOrder(orderData);

// Cache for 24 hours
await redis.setex(`idempotency:${idempotencyKey}`, 86400, JSON.stringify(result));
```

## Health & Metrics Endpoints

### Health Checks
```
GET /health
Response: { status: "healthy", timestamp: "2026-02-23T10:00:00Z" }

GET /ready
Response: { 
  ready: true, 
  dependencies: {
    database: "connected",
    redis: "connected",
    rabbitmq: "connected"
  }
}
```

### Metrics (Prometheus Format)
```
# Order Gateway
http_requests_total{service="order-gateway",method="POST",endpoint="/orders",status="200"}
http_request_duration_seconds{service="order-gateway",endpoint="/orders"}
order_processing_time_seconds
cache_hit_rate{service="order-gateway"}

# Stock Service
stock_reservation_total{status="success|failure"}
stock_level{item_id="123"}
concurrent_reservations_gauge

# Kitchen Queue
queue_depth_gauge{queue="order.created"}
order_processing_duration_seconds
cooking_simulation_duration_seconds
```

## Performance Targets

| Metric | Target | Monitoring |
|--------|--------|------------|
| Order Acknowledgment | < 2s (p95) | Prometheus alert |
| Stock Reservation | < 500ms (p99) | Distributed tracing |
| Cache Hit Rate | > 80% | Grafana dashboard |
| Message Processing | < 100ms (p95) | RabbitMQ metrics |
| Cooking Simulation | 3-7s | Custom metric |
| System Availability | 99.9% | Uptime monitoring |

## Security Considerations

1. **JWT Security**
   - RS256 asymmetric encryption
   - Short-lived access tokens (15 min)
   - Refresh token rotation
   - Token blacklist in Redis

2. **Rate Limiting**
   - Per-user: 10 orders/min
   - Per-IP: 100 requests/min
   - Global: 1000 orders/min

3. **Input Validation**
   - JSON schema validation
   - SQL injection prevention (parameterized queries)
   - XSS protection (sanitize inputs)

4. **Network Security**
   - Internal services not exposed externally
   - mTLS between services (production)
   - API Gateway as single entry point

## Scalability Strategy

### Horizontal Scaling
- Order Gateway: 3-10 instances (load balanced)
- Stock Service: 2-5 instances (stateless)
- Kitchen Queue: 2-5 workers (consumer groups)
- Notification Hub: 2-3 instances (sticky sessions)

### Vertical Scaling
- Database: 4 vCPU, 16GB RAM (can scale to 8/32)
- Redis: 2 vCPU, 8GB RAM
- RabbitMQ: 2 vCPU, 4GB RAM

### Database Optimization
- Read replicas for reporting queries
- Connection pooling (PgBouncer)
- Indexed columns: user_id, order_id, created_at
- Partitioning: Orders table by month
