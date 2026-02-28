# Kitchen Queue Microservice

Asynchronous order processing service that decouples order acknowledgment from cooking simulation, enabling sub-2-second order responses while processing orders in the background.

## Purpose

The Kitchen Queue service acts as a buffer between order creation and order completion, allowing the Order Gateway to acknowledge orders immediately (< 2s) while the actual cooking process happens asynchronously (3-7s).

## Features

- ✅ Async order processing with RabbitMQ
- ✅ Worker consumers with prefetch control
- ✅ Cooking simulation (3-7 seconds random delay)
- ✅ Retry mechanism with exponential backoff
- ✅ Dead letter queue for failed messages
- ✅ Graceful shutdown with active job completion
- ✅ Comprehensive metrics (Prometheus)
- ✅ Health and readiness checks
- ✅ Event-driven architecture

## Architecture

```
┌─────────────────┐
│  Order Gateway  │
└────────┬────────┘
         │ publish: order.created
         ↓
┌─────────────────────────────────┐
│      RabbitMQ Exchange          │
│         (orders)                │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│   Queue: order.created          │
│   (Durable, DLQ enabled)        │
└────────┬────────────────────────┘
         │ consume (prefetch: 10)
         ↓
┌─────────────────────────────────┐
│    Kitchen Queue Worker         │
│                                 │
│  1. Receive order               │
│  2. Update status: PROCESSING   │
│  3. Publish: order.processing   │
│  4. Simulate cooking (3-7s)     │
│  5. Update status: READY        │
│  6. Publish: order.completed    │
│  7. ACK message                 │
└─────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│   Notification Hub              │
│   (Consumes order.completed)    │
└─────────────────────────────────┘
```

## Flow

### Happy Path

```
1. Order Gateway publishes order.created event
   ↓ (< 100ms)
2. Kitchen Queue receives message
   ↓ (< 50ms)
3. Update order status to PROCESSING
   ↓ (< 50ms)
4. Publish order.processing event
   ↓ (3-7 seconds)
5. Simulate cooking process
   ↓ (< 50ms)
6. Update order status to READY
   ↓ (< 50ms)
7. Publish order.completed event
   ↓ (< 10ms)
8. ACK message

Total: 3-7 seconds (async, doesn't block order acknowledgment)
```

### Retry Path

```
1. Message processing fails
   ↓
2. Check retry count
   ├─ If < MAX_RETRIES (3):
   │  ├─ NACK message (no requeue)
   │  ├─ Wait RETRY_DELAY (5s)
   │  └─ Republish with x-retry-count++
   └─ If >= MAX_RETRIES:
      ├─ Send to dead letter queue
      ├─ Update order status to FAILED
      ├─ Publish order.failed event
      └─ NACK message
```

## API Endpoints

### GET /health
Basic health check.

```bash
curl http://localhost:3004/health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "kitchen-queue",
  "timestamp": "2026-02-23T10:00:00Z"
}
```

### GET /ready
Readiness check with dependencies.

```bash
curl http://localhost:3004/ready
```

**Response (200 OK):**
```json
{
  "ready": true,
  "service": "kitchen-queue",
  "dependencies": {
    "database": "connected",
    "rabbitmq": "connected"
  },
  "timestamp": "2026-02-23T10:00:00Z"
}
```

### GET /metrics
Prometheus metrics.

```bash
curl http://localhost:3004/metrics
```

## Events

See [EVENT_SCHEMA.md](./EVENT_SCHEMA.md) for complete event documentation.

### Consumed Events

**order.created** - New order from Order Gateway
```json
{
  "order_id": "ORD-123",
  "user_id": 456,
  "student_id": "STU789",
  "items": [{"id": "item-001", "quantity": 2}],
  "total_amount": 25.98,
  "created_at": "2026-02-23T18:25:00Z"
}
```

### Published Events

**order.processing** - Order started processing
```json
{
  "order_id": "ORD-123",
  "status": "PROCESSING",
  "started_at": "2026-02-23T18:25:01Z"
}
```

**order.completed** - Order ready for pickup
```json
{
  "order_id": "ORD-123",
  "status": "READY",
  "completed_at": "2026-02-23T18:25:06Z",
  "cooking_duration": 5.234
}
```

**order.failed** - Order processing failed
```json
{
  "order_id": "ORD-123",
  "status": "FAILED",
  "error": "Processing timeout",
  "failed_at": "2026-02-23T18:25:30Z"
}
```

## Configuration

### Environment Variables

```bash
# Worker Configuration
WORKER_PREFETCH=10          # Messages to prefetch
WORKER_CONCURRENCY=10       # Max concurrent processing

# Cooking Simulation
COOKING_MIN_TIME=3000       # Min cooking time (ms)
COOKING_MAX_TIME=7000       # Max cooking time (ms)

# Retry Configuration
MAX_RETRIES=3               # Max retry attempts
RETRY_DELAY=5000            # Delay between retries (ms)
```

### Queue Configuration

- **Prefetch Count**: 10 (fair dispatch)
- **Durable Queues**: Yes (survive broker restart)
- **Manual ACK**: Yes (reliability)
- **Dead Letter Queue**: Yes (failed messages)

## Metrics

### Order Metrics
- `order_processed_total{status}` - Total orders processed
- `order_processing_duration_seconds{status}` - Processing duration
- `cooking_simulation_duration_seconds` - Cooking time histogram

### Queue Metrics
- `queue_depth{queue}` - Current queue depth
- `active_workers` - Number of active workers
- `message_ack_total{queue}` - Acknowledged messages
- `message_nack_total{queue}` - Rejected messages

### Retry Metrics
- `message_retry_total{queue}` - Total retries
- `dead_letter_total{queue, reason}` - Dead letter messages

### HTTP Metrics
- `http_requests_total{method, route, status_code}` - Total requests
- `http_request_duration_seconds{method, route, status_code}` - Request duration

## Performance

### Benchmarks
- Message consumption: < 50ms
- Status update: < 50ms
- Event publishing: < 100ms
- Cooking simulation: 3-7 seconds (configurable)
- Total processing: 3-7 seconds

### Throughput
- Prefetch: 10 messages
- Concurrent: 10 orders
- Throughput: ~60-120 orders/minute

### Latency
- Order acknowledgment (Gateway): < 2s ✅
- Order processing (Kitchen): 3-7s ✅
- End-to-end: 3-9s

## Development

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (for order status)
- RabbitMQ 3.12+

### Setup

```bash
# Install dependencies
cd services/kitchen-queue
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
# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

### Docker

```bash
# Build image
docker build -t kitchen-queue .

# Run container
docker run -p 3004:3004 \
  -e DATABASE_URL=postgresql://... \
  -e RABBITMQ_URL=amqp://... \
  kitchen-queue
```

## Monitoring

### Prometheus Queries

```promql
# Order processing rate
rate(order_processed_total{status="success"}[5m])

# Average cooking time
rate(cooking_simulation_duration_seconds_sum[5m]) / rate(cooking_simulation_duration_seconds_count[5m])

# Queue depth
queue_depth{queue="order.created"}

# Dead letter rate
rate(dead_letter_total[5m])

# Retry rate
rate(message_retry_total[5m])
```

### Alerts

```yaml
# High queue depth
- alert: HighQueueDepth
  expr: queue_depth{queue="order.created"} > 100
  for: 5m

# High dead letter rate
- alert: HighDeadLetterRate
  expr: rate(dead_letter_total[5m]) > 1
  for: 5m

# Low processing rate
- alert: LowProcessingRate
  expr: rate(order_processed_total{status="success"}[5m]) < 1
  for: 10m

# High retry rate
- alert: HighRetryRate
  expr: rate(message_retry_total[5m]) > 5
  for: 5m
```

## Graceful Shutdown

The service implements graceful shutdown to ensure no orders are lost:

1. Stop accepting new messages
2. Wait for active processing to complete (max 30s)
3. Close RabbitMQ connection
4. Close HTTP server
5. Exit

```bash
# Send SIGTERM or SIGINT
kill -TERM <pid>

# Or use Docker
docker stop kitchen-queue
```

## Troubleshooting

### High queue depth
- Check worker health: `curl http://localhost:3004/ready`
- Review metrics: `queue_depth{queue="order.created"}`
- Scale workers: Increase `WORKER_PREFETCH`
- Check database connectivity

### Messages in dead letter queue
- Review logs for errors
- Check message format
- Verify retry configuration
- Manually reprocess if needed

### Slow processing
- Check cooking simulation time
- Verify database performance
- Review concurrent processing
- Monitor system resources

### Worker not consuming
- Check RabbitMQ connection
- Verify queue exists
- Review consumer logs
- Check prefetch configuration

## Best Practices

1. **Set appropriate prefetch count** based on processing time
2. **Monitor queue depth** to detect issues early
3. **Handle dead letter messages** with alerting
4. **Use structured logging** with order_id for tracing
5. **Implement idempotency** in downstream consumers
6. **Test graceful shutdown** in staging
7. **Monitor retry rates** to detect systemic issues
8. **Scale workers** based on queue depth

## Scaling

### Horizontal Scaling

```bash
# Scale to 3 workers
docker-compose up -d --scale kitchen-queue=3
```

Each worker:
- Consumes from the same queue
- Processes messages independently
- Fair dispatch via prefetch count

### Vertical Scaling

Increase resources per worker:
- CPU: 1-2 cores
- Memory: 512MB-1GB
- Prefetch: 10-20 messages

## License

MIT
