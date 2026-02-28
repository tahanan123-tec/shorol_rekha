# Observability Stack Documentation

Complete monitoring, metrics, and tracing solution for the Cafeteria Ordering System.

## Components

### 1. Prometheus (Metrics Collection)
- **Port**: 9090
- **Purpose**: Time-series metrics database
- **Scrapes**: All microservices every 15 seconds
- **Retention**: 30 days

### 2. Grafana (Visualization)
- **Port**: 3200
- **Purpose**: Metrics visualization and dashboards
- **Credentials**: admin/admin
- **Dashboards**: Pre-configured system and service dashboards

### 3. Jaeger (Distributed Tracing)
- **UI Port**: 16686
- **Purpose**: Request tracing across services
- **Storage**: Badger (persistent)
- **Protocols**: OTLP, Zipkin, Jaeger

### 4. OpenTelemetry Collector (Optional)
- **Ports**: 4317 (gRPC), 4318 (HTTP)
- **Purpose**: Unified telemetry collection
- **Exports**: To Jaeger

---

## Quick Start

### Start Observability Stack

```bash
# Start all monitoring services
docker-compose up -d prometheus grafana jaeger otel-collector

# Verify services are running
docker-compose ps prometheus grafana jaeger

# Check logs
docker-compose logs -f prometheus grafana jaeger
```

### Access Dashboards

- **Grafana**: http://localhost:3200 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Jaeger UI**: http://localhost:16686

---

## Grafana Dashboards

### System Overview Dashboard

**Features:**
- Service health status (UP/DOWN)
- Request rate per service
- Average latency trends
- Error rate percentage
- Order throughput
- WebSocket connections
- Stock levels
- RabbitMQ queue depth
- Database connections

**Alert**: Gateway latency > 1s for 30s

### Service Details Dashboard

**Features:**
- Request rate by endpoint
- Latency percentiles (p50, p95, p99)
- Status code distribution
- Memory usage
- CPU usage
- Active requests
- Cache hit rate

**Variable**: Select service to view

---

## Prometheus Metrics

### HTTP Metrics

```promql
# Request rate
rate(http_requests_total[1m])

# Average latency
rate(http_request_duration_seconds_sum[5m]) / 
rate(http_request_duration_seconds_count[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / 
rate(http_requests_total[5m]) * 100

# Latency percentiles
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Business Metrics

```promql
# Order throughput
rate(orders_created_total[1m]) * 60

# Stock levels
stock_quantity{item_id="item-001"}

# WebSocket connections
websocket_connections_total

# Queue depth
rabbitmq_queue_messages{queue="order.created"}
```

### System Metrics

```promql
# Memory usage
process_resident_memory_bytes / 1024 / 1024

# CPU usage
rate(process_cpu_seconds_total[1m]) * 100

# Service uptime
up{job="order-gateway"}
```

---

## Alerts

### Critical Alerts

#### 1. Gateway High Latency (REQUIRED)
```yaml
alert: GatewayHighLatency
expr: |
  rate(http_request_duration_seconds_sum{service="order-gateway"}[1m]) / 
  rate(http_request_duration_seconds_count{service="order-gateway"}[1m]) > 1
for: 30s
severity: critical
```

**Triggers when**: Order Gateway latency exceeds 1 second for 30 seconds

#### 2. Service Down
```yaml
alert: ServiceDown
expr: up{job=~"identity-provider|order-gateway|..."} == 0
for: 1m
severity: critical
```

### Warning Alerts

- High error rate (> 5% for 5 minutes)
- Low order throughput (< 10 orders/min for 10 minutes)
- High memory usage (> 500MB for 5 minutes)
- Queue buildup (> 1000 messages for 5 minutes)
- Stock depletion

---

## Distributed Tracing with Jaeger

### Trace Collection

Services send traces to Jaeger using OpenTelemetry:

```javascript
// Example: Node.js with OpenTelemetry
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');

const provider = new NodeTracerProvider();
const exporter = new JaegerExporter({
  endpoint: 'http://jaeger:14268/api/traces',
  serviceName: 'order-gateway',
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();
```

### View Traces

1. Open Jaeger UI: http://localhost:16686
2. Select service from dropdown
3. Click "Find Traces"
4. View trace details and spans

### Trace Features

- **Service dependency graph**: Visualize service interactions
- **Latency analysis**: Identify slow operations
- **Error tracking**: Find failed requests
- **Request flow**: Follow request across services

---

## Configuration

### Prometheus Scrape Configuration

Located in `infrastructure/prometheus/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'order-gateway'
    static_configs:
      - targets: ['order-gateway:3002']
        labels:
          service: 'order-gateway'
```

### Alert Rules

Located in `infrastructure/prometheus/alerts.yml`:

```yaml
groups:
  - name: service_health
    interval: 10s
    rules:
      - alert: GatewayHighLatency
        expr: ...
        for: 30s
```

### Grafana Datasource

Located in `monitoring/grafana/provisioning/datasources/prometheus.yml`:

```yaml
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
```

---

## Monitoring Best Practices

### 1. Metrics to Monitor

**Golden Signals:**
- **Latency**: How long requests take
- **Traffic**: Request rate
- **Errors**: Error rate
- **Saturation**: Resource utilization

**RED Method:**
- **Rate**: Requests per second
- **Errors**: Error rate
- **Duration**: Request latency

### 2. Alert Thresholds

- **Latency**: > 1s for critical paths
- **Error Rate**: > 5% sustained
- **Availability**: < 99.9%
- **Queue Depth**: > 1000 messages

### 3. Dashboard Organization

- **Overview**: System-wide metrics
- **Service**: Per-service details
- **Business**: Order metrics, stock levels
- **Infrastructure**: Database, cache, queue

---

## Troubleshooting

### Prometheus Not Scraping

**Check:**
```bash
# Verify targets
curl http://localhost:9090/api/v1/targets

# Check service metrics endpoint
curl http://localhost:3002/metrics

# View Prometheus logs
docker-compose logs prometheus
```

### Grafana Dashboard Not Loading

**Check:**
```bash
# Verify Grafana is running
docker-compose ps grafana

# Check datasource connection
curl http://localhost:3200/api/datasources

# View Grafana logs
docker-compose logs grafana
```

### Jaeger Not Receiving Traces

**Check:**
```bash
# Verify Jaeger is running
docker-compose ps jaeger

# Check collector endpoint
curl http://localhost:14269/

# View Jaeger logs
docker-compose logs jaeger
```

### High Memory Usage

**Solutions:**
- Reduce Prometheus retention: `--storage.tsdb.retention.time=15d`
- Decrease scrape frequency: `scrape_interval: 30s`
- Limit trace sampling rate

---

## Performance Impact

### Resource Usage

| Component | CPU | Memory | Disk |
|-----------|-----|--------|------|
| Prometheus | ~200m | ~1GB | ~10GB/month |
| Grafana | ~100m | ~200MB | ~100MB |
| Jaeger | ~200m | ~500MB | ~5GB/month |
| OTel Collector | ~100m | ~200MB | Minimal |

### Service Overhead

- **Metrics collection**: < 1ms per request
- **Trace sampling**: ~2-5ms per traced request
- **Network**: ~1KB per metric scrape

---

## Advanced Configuration

### Custom Metrics

Add to your service:

```javascript
const promClient = require('prom-client');

// Custom counter
const orderCounter = new promClient.Counter({
  name: 'orders_created_total',
  help: 'Total orders created',
  labelNames: ['status'],
});

// Custom histogram
const latencyHistogram = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Request latency',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

// Expose metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

### Alert Routing

Configure Alertmanager (optional):

```yaml
# alertmanager.yml
route:
  receiver: 'slack'
  group_by: ['alertname', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h

receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'YOUR_WEBHOOK_URL'
        channel: '#alerts'
```

### Trace Sampling

Configure sampling rate:

```javascript
// Sample 10% of requests
const sampler = new TraceIdRatioBasedSampler(0.1);

const provider = new NodeTracerProvider({
  sampler: sampler,
});
```

---

## Maintenance

### Daily Tasks
- Check alert status
- Review error rates
- Monitor resource usage

### Weekly Tasks
- Review dashboard metrics
- Analyze slow queries
- Check disk usage

### Monthly Tasks
- Update retention policies
- Review and optimize queries
- Archive old data
- Update dashboards

---

## Integration with Services

### Add Metrics to Service

1. Install prom-client:
```bash
npm install prom-client
```

2. Add metrics endpoint:
```javascript
const promClient = require('prom-client');
const register = new promClient.Registry();

promClient.collectDefaultMetrics({ register });

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

3. Update Prometheus config to scrape service

### Add Tracing to Service

1. Install OpenTelemetry:
```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

2. Initialize tracing:
```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: 'http://jaeger:14268/api/traces',
  }),
  serviceName: 'your-service',
});

sdk.start();
```

---

## Support

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
