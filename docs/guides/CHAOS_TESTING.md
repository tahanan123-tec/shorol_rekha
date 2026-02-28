# Chaos Engineering Testing Guide

Quick guide to test system resilience using the Chaos Monkey service.

## Prerequisites

1. System is running: `docker-compose up -d`
2. All services are healthy: `docker-compose ps`
3. Admin dashboard is accessible: http://localhost:3100

## Quick Tests

### Test 1: Service Recovery (2 minutes)

**Goal**: Verify automatic service recovery

```bash
# Kill order-gateway for 30 seconds
curl -X POST http://localhost:3006/chaos/kill-service \
  -H "Content-Type: application/json" \
  -d '{"serviceName": "order-gateway", "duration": 30000}'
```

**Expected Behavior**:
- ✅ Service health turns red in admin dashboard
- ✅ Client shows connection error
- ✅ After 30s, service automatically restarts
- ✅ Service health turns green
- ✅ Client reconnects and works normally

**Monitor**:
- Admin Dashboard: http://localhost:3100
- Service logs: `docker-compose logs -f order-gateway`

---

### Test 2: Latency Tolerance (3 minutes)

**Goal**: Test system behavior under high latency

```bash
# Inject 2000ms latency to stock-service
curl -X POST http://localhost:3006/chaos/inject-latency \
  -H "Content-Type: application/json" \
  -d '{"serviceName": "stock-service", "latencyMs": 2000, "duration": 60000}'
```

**Expected Behavior**:
- ✅ Order processing slows down
- ✅ Average latency increases in dashboard
- ✅ Orders still complete (no failures)
- ✅ After 60s, latency returns to normal
- ✅ System performance recovers

**Monitor**:
- Grafana: http://localhost:3200
- Prometheus: http://localhost:9090
- Query: `rate(http_request_duration_seconds_sum[1m])`

---

### Test 3: Message Broker Failure (2 minutes)

**Goal**: Test event-driven architecture resilience

```bash
# Simulate RabbitMQ failure for 45 seconds
curl -X POST http://localhost:3006/chaos/simulate-broker-failure \
  -H "Content-Type: application/json" \
  -d '{"duration": 45000}'
```

**Expected Behavior**:
- ✅ Order creation still works (synchronous path)
- ✅ Kitchen queue stops receiving orders
- ✅ Notifications stop temporarily
- ✅ After 45s, broker restarts
- ✅ Queued messages are processed
- ✅ Notifications resume

**Monitor**:
- RabbitMQ Management: http://localhost:15672
- Kitchen Queue logs: `docker-compose logs -f kitchen-queue`
- Notification Hub logs: `docker-compose logs -f notification-hub`

---

### Test 4: Cascading Failures (5 minutes)

**Goal**: Test circuit breakers and graceful degradation

**Step 1**: Kill stock-service
```bash
curl -X POST http://localhost:3006/chaos/kill-service \
  -H "Content-Type: application/json" \
  -d '{"serviceName": "stock-service", "duration": 60000}'
```

**Step 2**: Try to create an order via client
- Navigate to http://localhost:3000
- Login with STU001
- Click "Order Now"

**Expected Behavior**:
- ✅ Order gateway detects stock-service is down
- ✅ Returns appropriate error to client
- ✅ Client shows user-friendly error message
- ✅ No database corruption
- ✅ After 60s, stock-service recovers
- ✅ Orders work normally again

**Step 3**: Restart stock-service manually
```bash
curl -X POST http://localhost:3006/chaos/restart-service \
  -H "Content-Type: application/json" \
  -d '{"serviceName": "stock-service"}'
```

---

### Test 5: Network Partition (3 minutes)

**Goal**: Test service isolation and error handling

```bash
# Block network between order-gateway and stock-service
curl -X POST http://localhost:3006/chaos/block-network \
  -H "Content-Type: application/json" \
  -d '{
    "serviceName": "order-gateway",
    "targetService": "stock-service",
    "duration": 30000
  }'
```

**Expected Behavior**:
- ✅ Order gateway cannot reach stock-service
- ✅ Timeout errors occur
- ✅ Circuit breaker may open
- ✅ Error rate increases in metrics
- ✅ After 30s, network recovers
- ✅ Circuit breaker closes
- ✅ Normal operation resumes

**Monitor**:
- Error rate in Grafana
- Circuit breaker status in logs
- Request timeout metrics

---

## Using the Admin Dashboard UI

### Step-by-Step

1. **Open Admin Dashboard**
   ```
   http://localhost:3100
   ```

2. **Enable Chaos Mode**
   - Click the "Chaos Mode" toggle in the header
   - Toggle turns red when active

3. **Select Target Service**
   - Use the dropdown to select a service
   - Example: "order-gateway"

4. **Set Duration**
   - Enter duration in seconds (5-300)
   - Example: 30 seconds

5. **Choose Experiment Type**

   **Kill Service**:
   - Click "Kill Service" button
   - Confirm the action
   - Watch service health turn red
   - Wait for auto-recovery

   **Inject Latency**:
   - Set latency in ms (100-10000)
   - Example: 1000ms
   - Click "Inject Latency"
   - Watch average latency increase

   **Broker Failure**:
   - Click "Simulate Broker Failure"
   - Confirm the action
   - Watch message queue stop

6. **Monitor Active Experiments**
   - View active experiments panel
   - See elapsed and remaining time
   - Click "Stop All" for emergency stop

7. **Check Results**
   - Watch service health grid
   - View metrics charts
   - Check Grafana dashboards

---

## Advanced Scenarios

### Scenario A: Peak Load + Chaos

**Goal**: Test resilience under load

1. **Generate Load**
   ```bash
   # Run load test (if available)
   npm run load-test
   ```

2. **Inject Chaos**
   ```bash
   # Kill one kitchen-queue instance
   curl -X POST http://localhost:3006/chaos/kill-service \
     -H "Content-Type: application/json" \
     -d '{"serviceName": "kitchen-queue", "duration": 60000}'
   ```

3. **Observe**
   - Remaining instances handle load
   - Queue depth increases temporarily
   - After recovery, queue drains
   - No orders lost

### Scenario B: Multiple Failures

**Goal**: Test worst-case scenarios

1. **Kill Multiple Services**
   ```bash
   # Kill stock-service
   curl -X POST http://localhost:3006/chaos/kill-service \
     -H "Content-Type: application/json" \
     -d '{"serviceName": "stock-service", "duration": 45000}'
   
   # Wait 10 seconds, then kill kitchen-queue
   sleep 10
   curl -X POST http://localhost:3006/chaos/kill-service \
     -H "Content-Type: application/json" \
     -d '{"serviceName": "kitchen-queue", "duration": 45000}'
   ```

2. **Observe**
   - Order creation fails (stock-service down)
   - Kitchen processing stops (kitchen-queue down)
   - Notification hub continues working
   - Services recover independently
   - System returns to normal

### Scenario C: Resource Exhaustion

**Goal**: Test under resource pressure

1. **Inject CPU Stress**
   ```bash
   curl -X POST http://localhost:3006/chaos/inject-cpu-stress \
     -H "Content-Type: application/json" \
     -d '{
       "serviceName": "order-gateway",
       "cpuPercent": 80,
       "duration": 60000
     }'
   ```

2. **Observe**
   - Response times increase
   - Throughput decreases
   - Service remains available
   - After 60s, performance recovers

---

## Monitoring During Chaos

### Grafana Dashboards

1. **System Overview**
   - http://localhost:3200/d/system-overview
   - Watch overall health
   - Monitor request rates
   - Check error rates

2. **Service Details**
   - http://localhost:3200/d/service-details
   - Per-service metrics
   - Latency percentiles
   - Resource usage

### Prometheus Queries

```promql
# Error rate
rate(http_requests_total{status=~"5.."}[1m])

# Average latency
rate(http_request_duration_seconds_sum[1m]) / rate(http_request_duration_seconds_count[1m])

# Active connections
websocket_connections_total

# Queue depth
rabbitmq_queue_messages
```

### Jaeger Tracing

1. Navigate to http://localhost:16686
2. Select service: "order-gateway"
3. Click "Find Traces"
4. Look for failed traces during chaos
5. Analyze error propagation

---

## Safety Checklist

Before running chaos experiments:

- [ ] System is in development/staging environment
- [ ] All services are healthy
- [ ] Monitoring is active (Grafana, Prometheus)
- [ ] Team is aware of the test
- [ ] Backup/rollback plan is ready
- [ ] Duration is set (not indefinite)
- [ ] "Stop All" button is accessible

---

## Troubleshooting

### Chaos Experiment Won't Start

**Problem**: API returns error

**Solutions**:
1. Check chaos-monkey is running:
   ```bash
   docker-compose ps chaos-monkey
   ```

2. Check logs:
   ```bash
   docker-compose logs chaos-monkey
   ```

3. Verify Docker socket:
   ```bash
   docker-compose exec chaos-monkey ls -la /var/run/docker.sock
   ```

### Service Won't Recover

**Problem**: Service stays down after duration

**Solutions**:
1. Manually restart:
   ```bash
   docker-compose restart <service-name>
   ```

2. Check health:
   ```bash
   curl http://localhost:<port>/health
   ```

3. Check logs for errors:
   ```bash
   docker-compose logs <service-name>
   ```

### Network Chaos Persists

**Problem**: Latency remains after experiment

**Solutions**:
1. Stop all chaos:
   ```bash
   curl -X POST http://localhost:3006/chaos/stop-all
   ```

2. Restart affected service:
   ```bash
   docker-compose restart <service-name>
   ```

3. Check network rules:
   ```bash
   docker-compose exec <service-name> tc qdisc show
   docker-compose exec <service-name> iptables -L
   ```

---

## Results Documentation

### Template

After each test, document:

```markdown
## Test: [Name]
**Date**: [Date/Time]
**Duration**: [Duration]
**Target**: [Service Name]

### Configuration
- Chaos Type: [kill/latency/network/etc]
- Parameters: [specific settings]
- Duration: [time]

### Observations
- [What happened]
- [Metrics observed]
- [Unexpected behavior]

### Results
- ✅ [Expected behavior confirmed]
- ❌ [Issues found]
- 💡 [Insights gained]

### Action Items
- [ ] [Improvements needed]
- [ ] [Bugs to fix]
- [ ] [Documentation updates]
```

---

## Next Steps

After completing basic tests:

1. **Increase Complexity**
   - Combine multiple chaos types
   - Test during peak load
   - Longer durations

2. **Automate Testing**
   - Create chaos test scripts
   - Integrate with CI/CD
   - Schedule regular chaos tests

3. **Improve Resilience**
   - Add circuit breakers
   - Implement retries
   - Improve error handling
   - Add fallback mechanisms

4. **Document Findings**
   - Update architecture docs
   - Create runbooks
   - Share learnings with team

---

## Resources

- [Chaos Engineering Summary](./CHAOS_ENGINEERING_SUMMARY.md)
- [Chaos Monkey README](./services/chaos-monkey/README.md)
- [Admin Dashboard Guide](./admin-dashboard/README.md)
- [Principles of Chaos Engineering](https://principlesofchaos.org/)

---

**Happy Chaos Testing! 🔥**

Remember: The goal is to find weaknesses before they cause real problems. Every failure is a learning opportunity.
