# Admin Dashboard Setup Guide

Quick setup guide for the admin monitoring dashboard.

## Prerequisites

- Node.js 20+
- Prometheus running on port 9090
- All microservices running with `/health` and `/metrics` endpoints

## Quick Start

### 1. Install Dependencies

```bash
cd admin-dashboard
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_PROMETHEUS_URL=http://localhost:9090
NEXT_PUBLIC_SERVICES_BASE_URL=http://localhost
```

### 3. Start Development Server

```bash
npm run dev
```

Dashboard available at: http://localhost:3100

## Prometheus Setup

### 1. Install Prometheus

**Using Docker:**

```bash
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/infrastructure/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
  -v $(pwd)/infrastructure/prometheus/alerts.yml:/etc/prometheus/alerts.yml \
  prom/prometheus:latest
```

**Using Docker Compose:**

Add to `docker-compose.yml`:

```yaml
prometheus:
  image: prom/prometheus:latest
  container_name: prometheus
  ports:
    - "9090:9090"
  volumes:
    - ./infrastructure/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    - ./infrastructure/prometheus/alerts.yml:/etc/prometheus/alerts.yml
    - prometheus-data:/prometheus
  command:
    - '--config.file=/etc/prometheus/prometheus.yml'
    - '--storage.tsdb.path=/prometheus'
  networks:
    - cafeteria-network

volumes:
  prometheus-data:
```

### 2. Verify Prometheus

```bash
# Check Prometheus is running
curl http://localhost:9090/-/healthy

# Check targets
curl http://localhost:9090/api/v1/targets

# Query metrics
curl 'http://localhost:9090/api/v1/query?query=up'
```

### 3. Configure Service Discovery

Prometheus is configured to scrape metrics from all services. Ensure each service:

1. Exposes `/metrics` endpoint
2. Returns Prometheus-format metrics
3. Is accessible from Prometheus container

## Service Metrics Setup

Each service should expose these metrics:

### Required Metrics

```javascript
// In your service (example using prom-client)
const promClient = require('prom-client');

// Create a Registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Business Metrics

Add custom metrics for business logic:

```javascript
// Order metrics
const ordersCreated = new promClient.Counter({
  name: 'orders_created_total',
  help: 'Total number of orders created',
});

const ordersFailed = new promClient.Counter({
  name: 'orders_failed_total',
  help: 'Total number of failed orders',
});

// Stock metrics
const stockQuantity = new promClient.Gauge({
  name: 'stock_quantity',
  help: 'Current stock quantity',
  labelNames: ['item_id'],
});

// WebSocket metrics
const websocketConnections = new promClient.Gauge({
  name: 'websocket_connections_total',
  help: 'Number of active WebSocket connections',
});
```

## Docker Deployment

### Build Dashboard

```bash
docker build -t cafeteria-admin-dashboard \
  --build-arg NEXT_PUBLIC_PROMETHEUS_URL=http://prometheus:9090 \
  --build-arg NEXT_PUBLIC_SERVICES_BASE_URL=http://localhost \
  .
```

### Add to Docker Compose

```yaml
admin-dashboard:
  build:
    context: ./admin-dashboard
    args:
      NEXT_PUBLIC_PROMETHEUS_URL: http://prometheus:9090
      NEXT_PUBLIC_SERVICES_BASE_URL: http://localhost
  container_name: admin-dashboard
  ports:
    - "3100:3100"
  depends_on:
    - prometheus
  networks:
    - cafeteria-network
```

### Start Everything

```bash
docker-compose up -d
```

## Testing the Dashboard

### 1. Check Service Health

Navigate to http://localhost:3100

You should see:
- 5 service health cards (all green if services are running)
- System health at 100%
- Real-time metrics updating

### 2. Test Metrics

Open browser console and check for:
- No CORS errors
- Successful Prometheus queries
- Charts updating every 5 seconds

### 3. Test Chaos Mode

1. Enable "Chaos Mode" toggle
2. Click lightning bolt on a service
3. Confirm the action
4. Watch service turn red
5. Verify alerts appear

## Troubleshooting

### Dashboard Can't Connect to Services

**Problem**: All services show as unhealthy

**Solutions**:
1. Check services are running:
   ```bash
   docker-compose ps
   ```

2. Test health endpoints:
   ```bash
   curl http://localhost:3001/health
   curl http://localhost:3002/health
   ```

3. Check CORS configuration on services

4. Verify `NEXT_PUBLIC_SERVICES_BASE_URL` is correct

### Prometheus Queries Failing

**Problem**: Charts not showing data

**Solutions**:
1. Verify Prometheus is running:
   ```bash
   curl http://localhost:9090/-/healthy
   ```

2. Check Prometheus targets:
   ```bash
   open http://localhost:9090/targets
   ```

3. Verify services are being scraped:
   ```bash
   curl 'http://localhost:9090/api/v1/query?query=up'
   ```

4. Check `NEXT_PUBLIC_PROMETHEUS_URL` environment variable

### CORS Errors

**Problem**: Browser console shows CORS errors

**Solutions**:
1. Add CORS headers to service responses:
   ```javascript
   app.use((req, res, next) => {
     res.header('Access-Control-Allow-Origin', '*');
     res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
     res.header('Access-Control-Allow-Headers', 'Content-Type');
     next();
   });
   ```

2. Or use a reverse proxy (nginx) to handle CORS

### Charts Not Updating

**Problem**: Data is stale

**Solutions**:
1. Check auto-refresh is enabled
2. Verify refresh interval (default 5s)
3. Check browser console for errors
4. Ensure Prometheus has recent data

## Configuration Options

### Refresh Interval

Change in `src/lib/store.ts`:

```typescript
refreshInterval: 10000, // 10 seconds instead of 5
```

### Service Configuration

Add/modify services in `src/lib/api.ts`:

```typescript
export const SERVICES: ServiceConfig[] = [
  {
    name: 'my-new-service',
    displayName: 'My New Service',
    port: 3006,
    healthEndpoint: '/health',
    metricsEndpoint: '/metrics',
  },
  // ... existing services
];
```

### Prometheus Queries

Customize queries in `src/lib/api.ts`:

```typescript
export const getAverageLatency = async (serviceName: string): Promise<number> => {
  const query = `your_custom_query{service="${serviceName}"}`;
  // ... rest of implementation
};
```

## Production Deployment

### Environment Variables

```env
NEXT_PUBLIC_PROMETHEUS_URL=https://prometheus.yourdomain.com
NEXT_PUBLIC_SERVICES_BASE_URL=https://api.yourdomain.com
NODE_ENV=production
```

### Security

1. Add authentication:
   ```typescript
   // middleware.ts
   export function middleware(request: NextRequest) {
     const auth = request.headers.get('authorization');
     if (!auth) {
       return new Response('Unauthorized', { status: 401 });
     }
     // Verify token
   }
   ```

2. Restrict chaos mode to admins

3. Use HTTPS for all connections

4. Implement rate limiting

### Monitoring

Monitor the dashboard itself:
- Response times
- Error rates
- User sessions
- Query performance

## Next Steps

1. Set up alerting (Alertmanager)
2. Add user authentication
3. Configure custom dashboards
4. Integrate with incident management
5. Add log aggregation view

## Support

- Check [README.md](./README.md) for detailed documentation
- Review Prometheus documentation: https://prometheus.io/docs/
- Check service logs: `docker-compose logs <service>`
