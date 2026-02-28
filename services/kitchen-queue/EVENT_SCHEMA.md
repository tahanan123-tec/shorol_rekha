# Kitchen Queue Event Schema

## Overview

The Kitchen Queue service consumes and produces events through RabbitMQ using a topic exchange pattern. All events are published to the `orders` exchange with specific routing keys.

## Event Flow

```
Order Gateway → order.created → Kitchen Queue
                                      ↓
                                 (Processing)
                                      ↓
                    ┌─────────────────┴─────────────────┐
                    ↓                                   ↓
            order.processing                    order.completed
                    ↓                                   ↓
          Notification Hub                    Notification Hub
```

## Consumed Events

### 1. order.created

**Queue**: `order.created`  
**Routing Key**: `order.created`  
**Exchange**: `orders` (topic)

**Purpose**: Triggered when a new order is created by the Order Gateway.

**Schema**:
```json
{
  "order_id": "string (required)",
  "user_id": "integer (required)",
  "student_id": "string (required)",
  "items": [
    {
      "id": "string (required)",
      "quantity": "integer (required)"
    }
  ],
  "total_amount": "number (required)",
  "delivery_time": "string (optional, HH:MM format)",
  "created_at": "string (required, ISO 8601 timestamp)"
}
```

**Example**:
```json
{
  "order_id": "ORD-1708689600-a1b2c3d4",
  "user_id": 123,
  "student_id": "STU12345",
  "items": [
    {
      "id": "item-001",
      "quantity": 2
    },
    {
      "id": "item-003",
      "quantity": 1
    }
  ],
  "total_amount": 45.50,
  "delivery_time": "18:30",
  "created_at": "2026-02-23T18:25:00Z"
}
```

**Processing**:
1. Message received from queue
2. Order status updated to PROCESSING
3. Cooking simulation started (3-7 seconds)
4. Order status updated to READY
5. Completion event published

## Published Events

### 1. order.processing

**Queue**: `order.processing`  
**Routing Key**: `order.processing`  
**Exchange**: `orders` (topic)

**Purpose**: Indicates that an order has started processing in the kitchen.

**Schema**:
```json
{
  "order_id": "string (required)",
  "status": "string (required, value: 'PROCESSING')",
  "started_at": "string (required, ISO 8601 timestamp)"
}
```

**Example**:
```json
{
  "order_id": "ORD-1708689600-a1b2c3d4",
  "status": "PROCESSING",
  "started_at": "2026-02-23T18:25:01Z"
}
```

### 2. order.completed

**Queue**: `order.completed`  
**Routing Key**: `order.completed`  
**Exchange**: `orders` (topic)

**Purpose**: Indicates that an order has been completed and is ready for pickup.

**Schema**:
```json
{
  "order_id": "string (required)",
  "status": "string (required, value: 'READY')",
  "completed_at": "string (required, ISO 8601 timestamp)",
  "cooking_duration": "number (required, seconds)"
}
```

**Example**:
```json
{
  "order_id": "ORD-1708689600-a1b2c3d4",
  "status": "READY",
  "completed_at": "2026-02-23T18:25:06Z",
  "cooking_duration": 5.234
}
```

### 3. order.failed

**Queue**: `order.failed`  
**Routing Key**: `order.failed`  
**Exchange**: `orders` (topic)

**Purpose**: Indicates that an order processing failed after maximum retries.

**Schema**:
```json
{
  "order_id": "string (required)",
  "status": "string (required, value: 'FAILED')",
  "error": "string (required)",
  "failed_at": "string (required, ISO 8601 timestamp)"
}
```

**Example**:
```json
{
  "order_id": "ORD-1708689600-a1b2c3d4",
  "status": "FAILED",
  "error": "Cooking simulation timeout",
  "failed_at": "2026-02-23T18:25:30Z"
}
```

## Queue Configuration

### Main Queues

#### order.created
- **Durable**: Yes
- **Dead Letter Exchange**: `dlx`
- **Dead Letter Routing Key**: `order.dead_letter`
- **Prefetch Count**: 10 (configurable)
- **Auto-delete**: No

#### order.processing
- **Durable**: Yes
- **Auto-delete**: No

#### order.completed
- **Durable**: Yes
- **Auto-delete**: No

#### order.failed
- **Durable**: Yes
- **Auto-delete**: No

### Dead Letter Queue

#### order.dead_letter
- **Exchange**: `dlx` (topic)
- **Durable**: Yes
- **Purpose**: Stores messages that failed after maximum retries

## Retry Mechanism

### Configuration
- **Max Retries**: 3 (configurable via `MAX_RETRIES`)
- **Retry Delay**: 5 seconds (configurable via `RETRY_DELAY`)
- **Retry Header**: `x-retry-count`

### Retry Flow

```
1. Message received
2. Processing fails
3. Check retry count
   ├─ If < MAX_RETRIES:
   │  ├─ Increment x-retry-count header
   │  ├─ Wait RETRY_DELAY
   │  └─ Republish to queue
   └─ If >= MAX_RETRIES:
      ├─ Send to dead letter queue
      ├─ Publish order.failed event
      └─ Update order status to FAILED
```

### Example Message Headers

**First Attempt**:
```json
{
  "headers": {}
}
```

**Second Attempt (Retry 1)**:
```json
{
  "headers": {
    "x-retry-count": 1
  }
}
```

**Third Attempt (Retry 2)**:
```json
{
  "headers": {
    "x-retry-count": 2
  }
}
```

**Fourth Attempt (Retry 3)**:
```json
{
  "headers": {
    "x-retry-count": 3
  }
}
```

**After Max Retries**: Message sent to dead letter queue

## Message Properties

All published messages include:

```json
{
  "persistent": true,
  "contentType": "application/json",
  "timestamp": 1708689600000,
  "headers": {
    "x-retry-count": 0
  }
}
```

## Error Handling

### Validation Errors
- Missing `order_id`: Message rejected, sent to dead letter
- Missing `items`: Message rejected, sent to dead letter
- Invalid JSON: Message rejected, sent to dead letter

### Processing Errors
- Cooking simulation timeout: Retry with backoff
- Database connection error: Retry with backoff
- Event publishing error: Log error, continue processing

### Dead Letter Scenarios
1. Max retries exceeded
2. Invalid message format
3. Validation failures
4. Unrecoverable errors

## Monitoring

### Key Metrics
- `order_processed_total{status}` - Total orders processed
- `order_processing_duration_seconds{status}` - Processing duration
- `cooking_simulation_duration_seconds` - Cooking time
- `queue_depth{queue}` - Current queue depth
- `message_retry_total{queue}` - Total retries
- `dead_letter_total{queue, reason}` - Dead letter messages
- `message_ack_total{queue}` - Acknowledged messages
- `message_nack_total{queue}` - Rejected messages

### Queue Depth Monitoring

```promql
# Current queue depth
queue_depth{queue="order.created"}

# Dead letter queue depth
queue_depth{queue="dead_letter"}

# Alert if queue depth > 100
queue_depth{queue="order.created"} > 100
```

## Performance Characteristics

### Timing
- **Order Acknowledgment**: < 2 seconds (from Order Gateway)
- **Cooking Simulation**: 3-7 seconds (random)
- **Total Processing Time**: 3-7 seconds
- **Event Publishing**: < 100ms

### Throughput
- **Prefetch Count**: 10 messages
- **Concurrent Processing**: Up to 10 orders simultaneously
- **Throughput**: ~60-120 orders/minute (depending on cooking time)

## Integration Example

### Publishing to order.created (Order Gateway)

```javascript
const amqp = require('amqplib');

const connection = await amqp.connect('amqp://localhost:5672');
const channel = await connection.createChannel();

await channel.assertExchange('orders', 'topic', { durable: true });

const orderData = {
  order_id: 'ORD-123',
  user_id: 456,
  student_id: 'STU789',
  items: [{ id: 'item-001', quantity: 2 }],
  total_amount: 25.98,
  created_at: new Date().toISOString(),
};

channel.publish(
  'orders',
  'order.created',
  Buffer.from(JSON.stringify(orderData)),
  { persistent: true, contentType: 'application/json' }
);
```

### Consuming order.completed (Notification Hub)

```javascript
const amqp = require('amqplib');

const connection = await amqp.connect('amqp://localhost:5672');
const channel = await connection.createChannel();

await channel.assertQueue('order.completed', { durable: true });
await channel.bindQueue('order.completed', 'orders', 'order.completed');

channel.consume('order.completed', (message) => {
  const orderData = JSON.parse(message.content.toString());
  
  console.log('Order ready:', orderData.order_id);
  
  // Send notification to user
  notifyUser(orderData);
  
  channel.ack(message);
});
```

## Best Practices

1. **Always set persistent: true** for message durability
2. **Use manual acknowledgment** (noAck: false) for reliability
3. **Implement idempotency** in message handlers
4. **Monitor queue depth** to detect processing issues
5. **Set appropriate prefetch count** based on processing time
6. **Handle dead letter messages** with alerting
7. **Log all retry attempts** for debugging
8. **Use structured logging** with order_id for tracing

## Troubleshooting

### High Queue Depth
- Check worker health
- Verify database connectivity
- Review processing duration metrics
- Scale workers if needed

### Messages in Dead Letter Queue
- Review error logs
- Check message format
- Verify retry configuration
- Manually reprocess if needed

### Slow Processing
- Check cooking simulation time
- Verify database performance
- Review concurrent processing count
- Monitor system resources
