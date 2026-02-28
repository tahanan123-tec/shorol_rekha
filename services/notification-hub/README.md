# Notification Hub

Real-time notification service with WebSocket support for instant order status updates. Designed for horizontal scalability using Redis adapter.

## Features

- ✅ WebSocket real-time communication (Socket.IO)
- ✅ No polling required - instant push notifications
- ✅ Horizontal scalability with Redis adapter
- ✅ JWT authentication
- ✅ Room-based subscriptions (user rooms, order rooms)
- ✅ Event-driven architecture (RabbitMQ consumers)
- ✅ Support for thousands of concurrent connections
- ✅ Comprehensive metrics (Prometheus)
- ✅ Graceful shutdown

## Architecture

### Horizontal Scaling with Redis Adapter

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Client A     │     │ Client B     │     │ Client C     │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │ WebSocket          │ WebSocket          │ WebSocket
       ↓                    ↓                    ↓
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Hub Instance │     │ Hub Instance │     │ Hub Instance │
│      #1      │     │      #2      │     │      #3      │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Redis Pub/Sub │
                    │   (Adapter)    │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │   RabbitMQ     │
                    │  (Events)      │
                    └────────────────┘
```

**How it works:**
1. Client connects to any hub instance
2. Hub instances communicate via Redis pub/sub
3. Events from RabbitMQ are consumed by all instances
4. Notifications are broadcast across all instances via Redis
5. Clients receive updates regardless of which instance they're connected to

## Order Status Flow

```
Order Created (Gateway)
         ↓
    PENDING
         ↓
Stock Verified (Stock Service)
         ↓
    PROCESSING (Kitchen Queue)
         ↓ (3-7 seconds)
    READY (Kitchen Queue)
         ↓
Client Notified (Notification Hub)
```

## WebSocket Connection

### Client Connection

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3005', {
  path: '/notifications',
  auth: {
    token: 'your-jwt-token'
  },
  transports: ['websocket', 'polling']
});

// Connection established
socket.on('connected', (data) => {
  console.log('Connected:', data);
  // { message: 'Connected to notification hub', userId: 123, timestamp: '...' }
});

// Subscribe to specific order
socket.emit('subscribe:order', 'ORD-123');

// Listen for order status updates
socket.on('order:status', (data) => {
  console.log('Order update:', data);
  // {
  //   order_id: 'ORD-123',
  //   status: 'READY',
  //   message: 'Your order is ready for pickup!',
  //   timestamp: '...'
  // }
});

// Listen for stock updates
socket.on('stock:updated', (data) => {
  console.log('Stock update:', data);
  // {
  //   item_id: 'item-001',
  //   quantity: 50,
  //   timestamp: '...'
  // }
});

// Handle disconnection
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

### Authentication

WebSocket connections require JWT authentication:

```javascript
// Option 1: Auth object
const socket = io('http://localhost:3005', {
  auth: { token: 'your-jwt-token' }
});

// Option 2: Query parameter
const socket = io('http://localhost:3005?token=your-jwt-token');
```

## Events

### Client → Server

**subscribe:order**
Subscribe to order-specific updates.
```javascript
socket.emit('subscribe:order', 'ORD-123');
```

**unsubscribe:order**
Unsubscribe from order updates.
```javascript
socket.emit('unsubscribe:order', 'ORD-123');
```

**ping**
Keep-alive ping.
```javascript
socket.emit('ping');
socket.on('pong', (data) => console.log(data));
```

### Server → Client

**connected**
Connection confirmation.
```json
{
  "message": "Connected to notification hub",
  "userId": 123,
  "timestamp": "2026-02-23T10:00:00Z"
}
```

**subscribed**
Subscription confirmation.
```json
{
  "type": "order",
  "id": "ORD-123",
  "timestamp": "2026-02-23T10:00:00Z"
}
```

**order:status**
Order status update.
```json
{
  "order_id": "ORD-123",
  "status": "PROCESSING",
  "message": "Your order is being prepared in the kitchen",
  "started_at": "2026-02-23T18:25:01Z",
  "timestamp": "2026-02-23T18:25:01Z"
}
```

**stock:updated**
Stock level update (broadcast to all).
```json
{
  "item_id": "item-001",
  "quantity": 50,
  "reserved_quantity": 10,
  "version": 5,
  "timestamp": "2026-02-23T10:00:00Z"
}
```

## API Endpoints

### GET /health
Basic health check.

```bash
curl http://localhost:3005/health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "notification-hub",
  "timestamp": "2026-02-23T10:00:00Z"
}
```

### GET /ready
Readiness check with dependencies.

```bash
curl http://localhost:3005/ready
```

**Response (200 OK):**
```json
{
  "ready": true,
  "service": "notification-hub",
  "dependencies": {
    "redis": "connected",
    "rabbitmq": "connected",
    "websocket": "active",
    "websocket_connections": 150,
    "websocket_rooms": 75
  },
  "timestamp": "2026-02-23T10:00:00Z"
}
```

### GET /metrics
Prometheus metrics.

```bash
curl http://localhost:3005/metrics
```

### GET /stats
WebSocket connection statistics.

```bash
curl http://localhost:3005/stats
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "connections": 150,
    "rooms": 75
  },
  "timestamp": "2026-02-23T10:00:00Z"
}
```

## Metrics

### WebSocket Metrics
- `websocket_connections` - Active WebSocket connections
- `websocket_connection_total{status}` - Total connections (connected/disconnected)
- `active_rooms` - Number of active Socket.IO rooms

### Notification Metrics
- `notification_sent_total{event_type, status}` - Total notifications sent
- `notification_latency_seconds{event_type}` - Notification delivery latency
- `broadcast_total{room}` - Total broadcasts

### Message Metrics
- `message_processed_total{queue, status}` - Messages processed from queues

### HTTP Metrics
- `http_requests_total{method, route, status_code}` - Total HTTP requests
- `http_request_duration_seconds{method, route, status_code}` - Request duration

## Horizontal Scaling

### Why Redis Adapter?

Without Redis adapter:
- Each hub instance is isolated
- Clients must connect to the same instance
- No cross-instance communication

With Redis adapter:
- All instances share state via Redis pub/sub
- Clients can connect to any instance
- Notifications reach all clients regardless of instance

### Scaling Example

```bash
# Run 3 instances behind a load balancer
docker-compose up -d --scale notification-hub=3

# All instances share Redis for coordination
# Clients connect via load balancer
# Notifications reach all clients
```

### Load Balancer Configuration

**Nginx example:**
```nginx
upstream notification_hub {
    ip_hash;  # Sticky sessions for WebSocket
    server notification-hub-1:3005;
    server notification-hub-2:3005;
    server notification-hub-3:3005;
}

server {
    location /notifications {
        proxy_pass http://notification_hub;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## Performance

### Benchmarks
- Connection establishment: < 100ms
- Notification delivery: < 10ms
- Message processing: < 50ms
- Concurrent connections: 10,000+ per instance

### Capacity Planning

**Single Instance:**
- Connections: 10,000
- Memory: ~1GB
- CPU: 1-2 cores

**Three Instances:**
- Connections: 30,000
- Memory: ~3GB total
- CPU: 3-6 cores total

## Development

### Prerequisites
- Node.js 20+
- Redis 7+
- RabbitMQ 3.12+

### Setup

```bash
# Install dependencies
cd services/notification-hub
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start dependencies
docker-compose up -d redis rabbitmq

# Start service
npm run dev
```

### Testing WebSocket Connection

```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c "ws://localhost:3005/notifications?token=your-jwt-token"

# Subscribe to order
> {"type":"subscribe:order","data":"ORD-123"}

# Send ping
> {"type":"ping"}
```

### Docker

```bash
# Build image
docker build -t notification-hub .

# Run container
docker run -p 3005:3005 \
  -e REDIS_URL=redis://redis:6379 \
  -e RABBITMQ_URL=amqp://rabbitmq:5672 \
  notification-hub
```

## Monitoring

### Prometheus Queries

```promql
# Active connections
websocket_connections

# Connection rate
rate(websocket_connection_total{status="connected"}[5m])

# Notification rate
rate(notification_sent_total[5m])

# Notification latency (p95)
histogram_quantile(0.95, rate(notification_latency_seconds_bucket[5m]))

# Message processing rate
rate(message_processed_total{status="success"}[5m])
```

### Alerts

```yaml
# High connection count
- alert: HighWebSocketConnections
  expr: websocket_connections > 8000
  for: 5m

# High notification latency
- alert: HighNotificationLatency
  expr: histogram_quantile(0.95, notification_latency_seconds) > 0.1
  for: 5m

# Low message processing rate
- alert: LowMessageProcessingRate
  expr: rate(message_processed_total{status="success"}[5m]) < 1
  for: 10m
```

## Troubleshooting

### Clients not receiving notifications
- Check WebSocket connection status
- Verify JWT token is valid
- Check room subscriptions
- Review Redis adapter logs

### High latency
- Check Redis connection
- Review message queue depth
- Monitor CPU/memory usage
- Scale horizontally if needed

### Connection drops
- Check ping/pong intervals
- Verify load balancer timeout settings
- Review network stability
- Check client reconnection logic

## Best Practices

1. **Always authenticate** WebSocket connections
2. **Subscribe to specific rooms** to reduce noise
3. **Handle reconnection** on client side
4. **Use sticky sessions** in load balancer
5. **Monitor connection count** for capacity planning
6. **Scale horizontally** when approaching limits
7. **Implement exponential backoff** for reconnection
8. **Log connection events** for debugging

## License

MIT
