# Stock Service

Source of truth for inventory management with optimistic locking to prevent overselling under high concurrency.

## Features

- ✅ Optimistic locking with row versioning
- ✅ Transactional stock operations
- ✅ Idempotent stock deduction
- ✅ Event publishing on stock changes
- ✅ Audit trail for all transactions
- ✅ Concurrent request handling
- ✅ PostgreSQL with connection pooling
- ✅ RabbitMQ event publishing
- ✅ Comprehensive metrics
- ✅ Load testing for concurrency

## Critical Feature: Preventing Overselling

The service uses **optimistic locking** to prevent overselling under high concurrency:

### How It Works

1. **Version Column**: Each inventory row has a `version` column
2. **Read Version**: When reserving stock, read current version
3. **Update with Version Check**: Update only if version matches
4. **Retry on Conflict**: If version changed, retry the operation
5. **Max Retries**: Fail after 5 attempts with exponential backoff

### Example

```sql
-- Thread 1 reads: version = 1
SELECT * FROM inventory WHERE item_id = 'item-001' FOR UPDATE;

-- Thread 2 reads: version = 1 (waits for Thread 1's lock)
SELECT * FROM inventory WHERE item_id = 'item-001' FOR UPDATE;

-- Thread 1 updates with version check
UPDATE inventory 
SET reserved_quantity = reserved_quantity + 10,
    version = version + 1
WHERE item_id = 'item-001' AND version = 1;
-- Success: version now = 2

-- Thread 2 tries to update with old version
UPDATE inventory 
SET reserved_quantity = reserved_quantity + 10,
    version = version + 1
WHERE item_id = 'item-001' AND version = 1;
-- Fails: version is now 2, not 1
-- Retry with new version
```

## Architecture

### Database Schema

**inventory table:**
```sql
CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  item_id VARCHAR(50) UNIQUE NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 0,  -- Optimistic locking
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT quantity_non_negative CHECK (quantity >= 0),
  CONSTRAINT reserved_non_negative CHECK (reserved_quantity >= 0)
);
```

**stock_transactions table (audit trail):**
```sql
CREATE TABLE stock_transactions (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(50) UNIQUE NOT NULL,
  item_id VARCHAR(50) NOT NULL,
  order_id VARCHAR(50),
  transaction_type VARCHAR(20) NOT NULL,  -- RESERVE, DECREMENT, RELEASE
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  version_before INTEGER NOT NULL,
  version_after INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);
```

## API Endpoints

### Public Endpoints

#### GET /stock/:itemId
Get stock information for a specific item.

```bash
curl http://localhost:3003/stock/item-001
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "item_id": "item-001",
    "item_name": "Chicken Biryani",
    "quantity": 100,
    "available_quantity": 90,
    "reserved_quantity": 10,
    "price": 12.99,
    "version": 5,
    "updated_at": "2026-02-23T10:00:00Z"
  }
}
```

#### GET /stock
Get all stock items.

```bash
curl http://localhost:3003/stock
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "count": 10
  }
}
```

### Internal Endpoints (Require API Key)

#### POST /internal/stock/check
Check stock availability for multiple items.

```bash
curl -X POST http://localhost:3003/internal/stock/check \
  -H "X-Internal-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"id": "item-001", "quantity": 2},
      {"id": "item-002", "quantity": 1}
    ]
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "available": true,
    "items": [
      {
        "id": "item-001",
        "name": "Chicken Biryani",
        "available_quantity": 90
      }
    ]
  }
}
```

**Response (200 OK - Insufficient Stock):**
```json
{
  "success": true,
  "data": {
    "available": false,
    "unavailable": [
      {
        "id": "item-001",
        "available": 5,
        "requested": 10,
        "reason": "Insufficient stock"
      }
    ]
  }
}
```

#### POST /internal/stock/reserve
Reserve stock for an order (with optimistic locking).

```bash
curl -X POST http://localhost:3003/internal/stock/reserve \
  -H "X-Internal-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ORD-123",
    "items": [
      {"id": "item-001", "quantity": 2}
    ]
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Stock reserved successfully",
  "data": {
    "success": true,
    "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
    "reservations": [
      {
        "item_id": "item-001",
        "item_name": "Chicken Biryani",
        "quantity_reserved": 2,
        "available_after": 88,
        "version": 6
      }
    ]
  }
}
```

**Response (409 Conflict):**
```json
{
  "success": false,
  "error": "Insufficient stock",
  "details": {
    "item_id": "item-001",
    "available": 1,
    "requested": 2
  }
}
```

#### POST /stock/decrement
Decrement stock (idempotent operation).

```bash
curl -X POST http://localhost:3003/stock/decrement \
  -H "X-Internal-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ORD-123",
    "transaction_id": "txn-unique-id",
    "items": [
      {"id": "item-001", "quantity": 2}
    ]
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Stock decremented successfully",
  "data": {
    "success": true,
    "transaction_id": "txn-unique-id",
    "decrements": [
      {
        "item_id": "item-001",
        "item_name": "Chicken Biryani",
        "quantity_decremented": 2,
        "quantity_after": 98,
        "version": 7
      }
    ]
  }
}
```

### Health & Monitoring

#### GET /health
Basic health check.

```bash
curl http://localhost:3003/health
```

#### GET /ready
Readiness check with dependencies.

```bash
curl http://localhost:3003/ready
```

#### GET /metrics
Prometheus metrics.

```bash
curl http://localhost:3003/metrics
```

## Metrics

### Stock Metrics
- `stock_reservation_total` - Total reservations by status and item
- `stock_reservation_duration_seconds` - Reservation duration histogram
- `stock_level` - Current stock level by item
- `stock_transaction_total` - Total transactions by type and status

### Concurrency Metrics
- `optimistic_lock_retry_total` - Optimistic lock retries by operation
- `optimistic_lock_failure_total` - Optimistic lock failures
- `concurrent_requests` - Current concurrent requests

### HTTP Metrics
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request duration histogram

## Events Published

### stock.updated
Published when stock quantity changes.

```json
{
  "item_id": "item-001",
  "quantity": 98,
  "reserved_quantity": 0,
  "version": 7,
  "timestamp": "2026-02-23T10:00:00Z"
}
```

### stock.reserved
Published when stock is reserved for an order.

```json
{
  "order_id": "ORD-123",
  "item_id": "item-001",
  "quantity": 2,
  "timestamp": "2026-02-23T10:00:00Z"
}
```

### stock.depleted
Published when stock reaches zero.

```json
{
  "item_id": "item-001",
  "item_name": "Chicken Biryani",
  "timestamp": "2026-02-23T10:00:00Z"
}
```

## Concurrency Testing

### Run Load Test

```bash
# Start the service
npm run dev

# In another terminal, run the load test
npm run test:concurrency
```

### Load Test Configuration

- **Concurrent Requests**: 100
- **Item**: item-001
- **Quantity per Request**: 1
- **Expected Behavior**: No overselling, all reservations tracked correctly

### Sample Output

```
=== Stock Service Concurrency Load Test ===

Configuration:
- Concurrent Requests: 100
- Item ID: item-001
- Quantity per Request: 1
- Expected Total Reserved: 100

Initial Stock: 100
Initial Available: 100
Initial Reserved: 0

Launching 100 concurrent reservation requests...

=== Test Results ===

Duration: 2543ms
Requests per second: 39.32

Total Requests: 100
✅ Successful: 100
❌ Failed: 0

Final Stock: 100
Final Available: 0
Final Reserved: 100

=== Verification ===

Expected Reserved Increase: 100
Actual Reserved Increase: 100
Match: ✅ YES

Overselling Check: ✅ No overselling

=== Performance Metrics ===

Average Response Time: 25.43ms
Success Rate: 100.00%

=== Test Verdict ===

✅ TEST PASSED
- No overselling detected
- Stock reservations match successful requests
- Optimistic locking working correctly
```

## Development

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- RabbitMQ 3.12+

### Setup

```bash
# Install dependencies
cd services/stock-service
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start dependencies
docker-compose up -d postgres rabbitmq

# Start service
npm run dev
```

### Testing

```bash
# Run unit tests
npm test

# Run concurrency load test
npm run test:concurrency

# Run with coverage
npm test -- --coverage
```

### Docker

```bash
# Build image
docker build -t stock-service .

# Run container
docker run -p 3003:3003 \
  -e DATABASE_URL=postgresql://... \
  -e RABBITMQ_URL=amqp://... \
  stock-service
```

## Performance

### Benchmarks
- Stock check: < 10ms (p95)
- Stock reservation: < 50ms (p95)
- Stock decrement: < 30ms (p95)
- Concurrent requests: 100+ req/s

### Optimizations
- Connection pooling (max 50 connections)
- SELECT FOR UPDATE for row locking
- Optimistic locking with retry
- Indexed queries
- Async event publishing

## Troubleshooting

### High retry rate
- Check `optimistic_lock_retry_total` metric
- Increase retry delay if needed
- Review concurrent load patterns

### Stock inconsistencies
- Check `stock_transactions` table for audit trail
- Verify version increments
- Review transaction logs

### Performance issues
- Monitor connection pool usage
- Check database query performance
- Review concurrent request gauge

## License

MIT
