# Chaos Monkey Service

Chaos engineering service for testing system resilience by injecting controlled failures.

## Features

- **Kill Service**: Terminate any microservice container
- **Restart Service**: Restart terminated services
- **Latency Injection**: Add network latency to simulate slow connections
- **Network Blocking**: Block network traffic to/from services
- **Message Broker Failure**: Simulate RabbitMQ failures
- **CPU Stress**: Inject CPU load to test performance under stress
- **Memory Stress**: Inject memory pressure
- **Experiment Tracking**: Monitor active chaos experiments
- **Auto-recovery**: Automatically restore services after duration

## API Endpoints

### Kill Service
```bash
POST /chaos/kill-service
{
  "serviceName": "order-gateway",
  "duration": 30000  # Optional: auto-restart after 30s
}
```

### Restart Service
```bash
POST /chaos/restart-service
{
  "serviceName": "order-gateway"
}
```

### Inject Latency
```bash
POST /chaos/inject-latency
{
  "serviceName": "order-gateway",
  "latencyMs": 1000,
  "duration": 60000  # Optional
}
```

### Block Network
```bash
POST /chaos/block-network
{
  "serviceName": "order-gateway",
  "targetService": "stock-service",  # Optional: block specific service
  "duration": 30000  # Optional
}
```

### Simulate Broker Failure
```bash
POST /chaos/simulate-broker-failure
{
  "duration": 30000  # Optional: auto-restart after 30s
}
```

### Inject CPU Stress
```bash
POST /chaos/inject-cpu-stress
{
  "serviceName": "order-gateway",
  "cpuPercent": 80,
  "duration": 60000  # Optional
}
```

### Inject Memory Stress
```bash
POST /chaos/inject-memory-stress
{
  "serviceName": "order-gateway",
  "memoryMB": 500,
  "duration": 60000  # Optional
}
```

### Get Chaos Status
```bash
GET /chaos/status
```

### Stop All Chaos
```bash
POST /chaos/stop-all
```

### List Services
```bash
GET /services
```

## Docker Integration

The service requires access to Docker socket:

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
privileged: true
```

## Usage Examples

### Test Service Resilience

```bash
# Kill order gateway for 30 seconds
curl -X POST http://localhost:3006/chaos/kill-service \
  -H "Content-Type: application/json" \
  -d '{"serviceName": "order-gateway", "duration": 30000}'

# Observe system behavior
# - Circuit breakers should activate
# - Requests should be retried
# - Service should auto-recover after 30s
```

### Test Latency Tolerance

```bash
# Add 2 second latency to stock service
curl -X POST http://localhost:3006/chaos/inject-latency \
  -H "Content-Type: application/json" \
  -d '{"serviceName": "stock-service", "latencyMs": 2000, "duration": 60000}'

# Observe:
# - Request timeouts
# - Retry behavior
# - User experience impact
```

### Test Message Broker Failure

```bash
# Simulate RabbitMQ failure for 1 minute
curl -X POST http://localhost:3006/chaos/simulate-broker-failure \
  -H "Content-Type: application/json" \
  -d '{"duration": 60000}'

# Observe:
# - Order processing stops
# - Messages queue up
# - System recovers when broker restarts
```

## UI Integration

The admin dashboard includes a chaos engineering panel:

1. Enable "Chaos Mode" toggle
2. Select target service
3. Choose experiment type
4. Set duration
5. Execute and observe

## Safety Features

- **Confirmation Required**: All destructive operations require confirmation
- **Auto-Recovery**: Services automatically restart after duration
- **Experiment Tracking**: Monitor all active experiments
- **Stop All**: Emergency stop for all chaos experiments
- **Audit Logging**: All chaos operations are logged

## Metrics

Chaos Monkey exposes Prometheus metrics:

```promql
# Total chaos experiments
chaos_experiments_total{type="kill",service="order-gateway",status="success"}

# HTTP request duration
http_request_duration_seconds
```

## Best Practices

### 1. Start Small
- Begin with non-critical services
- Use short durations (30-60 seconds)
- Test during low-traffic periods

### 2. Observe System Behavior
- Monitor metrics in Grafana
- Check logs for errors
- Verify circuit breakers activate
- Ensure graceful degradation

### 3. Document Findings
- Record what breaks
- Note recovery time
- Identify weak points
- Plan improvements

### 4. Gradual Escalation
- Single service → Multiple services
- Short duration → Longer duration
- Low impact → High impact

## Chaos Experiments

### Experiment 1: Service Failure
**Goal**: Verify circuit breakers work

**Steps**:
1. Kill order-gateway for 30s
2. Observe client behavior
3. Verify requests are retried
4. Confirm service recovers

**Expected**:
- Circuit breaker opens
- Fallback responses returned
- Service auto-recovers
- No data loss

### Experiment 2: Latency Injection
**Goal**: Test timeout handling

**Steps**:
1. Inject 2s latency to stock-service
2. Place orders
3. Observe timeout behavior
4. Check retry logic

**Expected**:
- Requests timeout appropriately
- Retries occur
- User sees loading state
- Eventually succeeds or fails gracefully

### Experiment 3: Broker Failure
**Goal**: Test message queue resilience

**Steps**:
1. Kill RabbitMQ for 1 minute
2. Place orders
3. Observe order processing
4. Verify recovery

**Expected**:
- Orders acknowledged but not processed
- Messages queue when broker returns
- Processing resumes automatically
- No orders lost

### Experiment 4: Cascading Failure
**Goal**: Test system-wide resilience

**Steps**:
1. Kill stock-service
2. Inject latency to order-gateway
3. Observe system behavior
4. Measure recovery time

**Expected**:
- Partial system degradation
- Non-affected features still work
- Graceful error messages
- Full recovery when services restore

## Troubleshooting

### Chaos Operations Fail

**Check**:
- Docker socket is mounted
- Service has privileged access
- Container names are correct
- Docker daemon is running

### Services Don't Restart

**Solution**:
- Manually restart: `docker-compose restart <service>`
- Check Docker logs: `docker logs <container>`
- Verify auto-restart policy in docker-compose

### Network Injection Doesn't Work

**Requirements**:
- Container must have `tc` (traffic control) installed
- Container must run as root or have NET_ADMIN capability

## Security Considerations

- **Production Use**: Disable in production or restrict access
- **Authentication**: Add authentication to chaos API
- **Authorization**: Implement role-based access control
- **Audit Trail**: Log all chaos operations
- **Rate Limiting**: Prevent abuse

## Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Run tests
npm test

# Build Docker image
docker build -t chaos-monkey .
```

## Environment Variables

```env
PORT=3006
NODE_ENV=production
LOG_LEVEL=info
DOCKER_SOCKET=/var/run/docker.sock
```

## License

MIT
