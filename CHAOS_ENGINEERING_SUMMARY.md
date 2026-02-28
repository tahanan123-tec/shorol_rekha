# Chaos Engineering Implementation Summary

## Overview

A complete chaos engineering module has been implemented to test system resilience and observe how the microservices architecture handles failures. The implementation includes a dedicated Chaos Monkey service with Docker integration and a comprehensive UI in the admin dashboard.

## Architecture

### Chaos Monkey Service

**Location**: `services/chaos-monkey/`
**Port**: 3006
**Technology**: Node.js + Express + Dockerode

The Chaos Monkey service runs as a privileged Docker container with access to the Docker socket, allowing it to manipulate other containers in the system.

### Key Features

1. **Service Failure Simulation**
   - Kill any service container
   - Auto-restart after specified duration
   - Manual restart capability

2. **Network Chaos**
   - Inject latency using traffic control (tc)
   - Block network traffic using iptables
   - Target specific services or all traffic

3. **Resource Stress**
   - CPU stress injection using stress-ng
   - Memory pressure simulation
   - Configurable intensity and duration

4. **Message Broker Failure**
   - Simulate RabbitMQ failures
   - Test system behavior without message queue
   - Auto-recovery after duration

5. **Experiment Tracking**
   - Track all active chaos experiments
   - Monitor elapsed and remaining time
   - Stop all experiments with one command

## API Endpoints

### Base URL: `http://localhost:3006`

#### Health Check
```
GET /health
```

#### Metrics
```
GET /metrics
```
Prometheus-compatible metrics endpoint.

#### List Services
```
GET /services
```
Returns all Docker containers managed by docker-compose.

#### Kill Service
```
POST /chaos/kill-service
Body: {
  "serviceName": "order-gateway",
  "duration": 30000  // Optional: auto-restart after 30s
}
```

#### Restart Service
```
POST /chaos/restart-service
Body: {
  "serviceName": "order-gateway"
}
```

#### Inject Latency
```
POST /chaos/inject-latency
Body: {
  "serviceName": "order-gateway",
  "latencyMs": 1000,
  "duration": 60000  // Optional: remove after 60s
}
```

#### Block Network
```
POST /chaos/block-network
Body: {
  "serviceName": "order-gateway",
  "targetService": "stock-service",  // Optional: block specific target
  "duration": 30000  // Optional
}
```

#### Simulate Broker Failure
```
POST /chaos/simulate-broker-failure
Body: {
  "duration": 60000  // Optional: auto-restart after 60s
}
```

#### Inject CPU Stress
```
POST /chaos/inject-cpu-stress
Body: {
  "serviceName": "order-gateway",
  "cpuPercent": 80,
  "duration": 60000  // Optional
}
```

#### Inject Memory Stress
```
POST /chaos/inject-memory-stress
Body: {
  "serviceName": "order-gateway",
  "memoryMB": 256,
  "duration": 60000  // Optional
}
```

#### Get Chaos Status
```
GET /chaos/status
```
Returns all active chaos experiments with timing information.

#### Stop All Chaos
```
POST /chaos/stop-all
```
Stops all active chaos experiments and restarts affected services.

## Admin Dashboard Integration

### Chaos Panel UI

**Location**: `admin-dashboard/src/components/ChaosPanel.tsx`

The Chaos Panel provides a user-friendly interface for chaos engineering:

- **Service Selection**: Dropdown to select target service
- **Duration Control**: Configure experiment duration (5-300 seconds)
- **Kill Service Button**: Terminate a service container
- **Restart Service Button**: Restart a stopped service
- **Latency Injection**: Add network latency (100-10000ms)
- **Broker Failure**: Simulate message broker failure
- **Active Experiments Display**: Real-time view of running experiments
- **Stop All Button**: Emergency stop for all chaos experiments

### Chaos Mode Toggle

The admin dashboard includes a "Chaos Mode" toggle in the header:
- Enables/disables the Chaos Panel visibility
- Visual indicator (red when active)
- Toast notifications for mode changes

### Environment Configuration

Add to `.env.local` or `.env`:
```bash
NEXT_PUBLIC_CHAOS_API_URL=http://localhost:3006
```

## Docker Configuration

### Chaos Monkey Service

```yaml
chaos-monkey:
  build:
    context: ./services/chaos-monkey
  container_name: chaos-monkey
  ports:
    - "3006:3006"
  environment:
    - NODE_ENV=production
    - PORT=3006
    - LOG_LEVEL=info
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  privileged: true
  networks:
    - backend
    - monitoring
  restart: unless-stopped
```

**Critical Requirements**:
- `privileged: true` - Required for network manipulation (tc, iptables)
- Docker socket mount - Required for container control
- Backend network access - To reach other services

### Admin Dashboard Update

```yaml
admin-dashboard:
  build:
    args:
      NEXT_PUBLIC_CHAOS_API_URL: http://chaos-monkey:3006
  depends_on:
    - chaos-monkey
```

## Usage Examples

### Example 1: Test Order Gateway Resilience

1. Enable Chaos Mode in admin dashboard
2. Select "order-gateway" from service dropdown
3. Set duration to 30 seconds
4. Click "Kill Service"
5. Observe:
   - Service health status turns red
   - Order creation fails
   - After 30s, service auto-restarts
   - System recovers automatically

### Example 2: Test Latency Tolerance

1. Select "stock-service"
2. Set latency to 2000ms
3. Set duration to 60 seconds
4. Click "Inject Latency"
5. Observe:
   - Order processing slows down
   - Gateway latency increases
   - Prometheus alerts may trigger
   - After 60s, latency returns to normal

### Example 3: Test Message Broker Failure

1. Click "Simulate Broker Failure"
2. Set duration to 45 seconds
3. Confirm the action
4. Observe:
   - Order events stop flowing
   - Kitchen queue stops receiving orders
   - Notifications stop
   - After 45s, broker restarts
   - Queued messages are processed

### Example 4: Test Network Partition

1. Select "order-gateway"
2. Use API directly to block stock-service:
```bash
curl -X POST http://localhost:3006/chaos/block-network \
  -H "Content-Type: application/json" \
  -d '{
    "serviceName": "order-gateway",
    "targetService": "stock-service",
    "duration": 30000
  }'
```
3. Observe:
   - Stock verification fails
   - Orders are rejected
   - Error rate increases
   - After 30s, network recovers

## Monitoring Chaos Experiments

### Prometheus Metrics

The Chaos Monkey service exposes metrics:
- `chaos_experiments_total` - Total experiments run
- `chaos_experiments_active` - Currently active experiments
- `chaos_service_kills_total` - Total service kills
- `chaos_latency_injections_total` - Total latency injections

### Grafana Dashboards

Monitor chaos impact using existing dashboards:
- **System Overview**: Watch overall health during chaos
- **Service Details**: Track per-service metrics
- **Gateway Latency Alert**: Triggers during latency injection

### Logs

View chaos operations in logs:
```bash
docker-compose logs -f chaos-monkey
```

## Safety Features

1. **Auto-Recovery**: All experiments support duration parameter for automatic cleanup
2. **Stop All**: Emergency button to stop all active experiments
3. **Confirmation Dialogs**: UI requires confirmation for destructive actions
4. **Experiment Tracking**: Real-time visibility of active experiments
5. **Health Checks**: Services automatically restart if they fail health checks

## Testing Scenarios

### Scenario 1: Single Service Failure
- **Goal**: Verify graceful degradation
- **Action**: Kill order-gateway for 30s
- **Expected**: Client shows error, system recovers after restart

### Scenario 2: Cascading Failures
- **Goal**: Test circuit breakers
- **Action**: Kill stock-service, then order-gateway
- **Expected**: Gateway handles stock service unavailability

### Scenario 3: Network Latency
- **Goal**: Test timeout handling
- **Action**: Inject 3000ms latency to kitchen-queue
- **Expected**: Orders still process, but slower

### Scenario 4: Message Broker Outage
- **Goal**: Test event-driven resilience
- **Action**: Kill RabbitMQ for 60s
- **Expected**: Services queue messages, process after recovery

### Scenario 5: Resource Exhaustion
- **Goal**: Test under resource pressure
- **Action**: Inject 90% CPU stress to order-gateway
- **Expected**: Increased latency but continued operation

## Best Practices

1. **Start Small**: Begin with short durations (10-30s)
2. **One at a Time**: Run one experiment at a time initially
3. **Monitor Closely**: Watch Grafana dashboards during experiments
4. **Document Results**: Record observations for each experiment
5. **Test in Stages**: Development → Staging → Production
6. **Schedule Chaos**: Run during low-traffic periods initially
7. **Have Rollback**: Keep "Stop All" button ready
8. **Alert Team**: Notify team before running chaos experiments

## Limitations

1. **Docker Socket Required**: Chaos Monkey needs Docker socket access
2. **Privileged Mode**: Required for network manipulation
3. **Container-Level Only**: Cannot inject chaos into processes within containers
4. **No Kubernetes Support**: Designed for Docker Compose only
5. **Manual Cleanup**: Some network rules may persist if container crashes

## Troubleshooting

### Chaos Monkey Won't Start
- Check Docker socket permissions
- Verify privileged mode is enabled
- Check port 3006 is available

### Network Chaos Not Working
- Ensure privileged mode is enabled
- Check if tc and iptables are available in target containers
- Verify network connectivity between containers

### Services Don't Restart
- Check Docker Compose restart policy
- Verify health check configuration
- Check container logs for errors

### UI Shows "Failed to Execute"
- Verify CHAOS_API_URL environment variable
- Check chaos-monkey service is running
- Check network connectivity from admin-dashboard

## Security Considerations

1. **Production Use**: Chaos engineering in production requires careful planning
2. **Access Control**: Implement authentication for chaos endpoints
3. **Audit Logging**: Log all chaos operations
4. **Rate Limiting**: Prevent abuse of chaos endpoints
5. **Network Isolation**: Run chaos-monkey in isolated network
6. **Least Privilege**: Only grant necessary Docker permissions

## Future Enhancements

- [ ] Scheduled chaos experiments
- [ ] Chaos templates/recipes
- [ ] Experiment history and analytics
- [ ] Automated resilience testing
- [ ] Integration with CI/CD pipeline
- [ ] Kubernetes support
- [ ] Advanced network chaos (packet loss, corruption)
- [ ] Disk I/O stress
- [ ] Custom chaos scripts
- [ ] Chaos experiment reports

## References

- [Chaos Engineering Principles](https://principlesofchaos.org/)
- [Netflix Chaos Monkey](https://netflix.github.io/chaosmonkey/)
- [Dockerode Documentation](https://github.com/apocas/dockerode)
- [Linux Traffic Control](https://man7.org/linux/man-pages/man8/tc.8.html)
- [stress-ng Documentation](https://wiki.ubuntu.com/Kernel/Reference/stress-ng)

## Quick Start

1. **Start the system**:
```bash
docker-compose up -d
```

2. **Access admin dashboard**:
```
http://localhost:3100
```

3. **Enable Chaos Mode**:
Click the "Chaos Mode" toggle in the header

4. **Run your first experiment**:
- Select a service
- Set duration to 30 seconds
- Click "Kill Service"
- Watch the system recover

5. **Monitor the impact**:
- Check service health grid
- View metrics charts
- Check Grafana dashboards

## Support

For issues or questions:
- Check service logs: `docker-compose logs chaos-monkey`
- Review API responses for error details
- Verify environment configuration
- Check Docker socket permissions

---

**Status**: ✅ Complete and Ready for Testing

The chaos engineering module is fully implemented and integrated with the admin dashboard. All features are functional and ready for resilience testing.
