# Admin Dashboard Quick Reference

## Quick Commands

```bash
# Install
npm install

# Development
npm run dev

# Build
npm run build

# Production
npm start

# Type check
npm run type-check

# Lint
npm run lint
```

## URLs

- Dashboard: http://localhost:3100
- Prometheus: http://localhost:9090
- Services: http://localhost:3001-3005

## Key Features

### Health Monitoring
- ✅ Green = Healthy
- ❌ Red = Unhealthy
- ❓ Gray = Unknown

### Metrics
- **System Health**: % of healthy services
- **Avg Latency**: Mean response time (ms)
- **Order Throughput**: Orders per minute
- **Request Rate**: Requests per second

### Controls
- **Auto-refresh**: Toggle automatic updates (5s interval)
- **Manual Refresh**: Force immediate update
- **Chaos Mode**: Enable service kill buttons

## Prometheus Queries

### Latency
```promql
rate(http_request_duration_seconds_sum{service="<service>"}[5m]) / 
rate(http_request_duration_seconds_count{service="<service>"}[5m])
```

### Request Rate
```promql
rate(http_requests_total{service="<service>"}[1m])
```

### Error Rate
```promql
rate(http_requests_total{service="<service>",status=~"5.."}[5m]) / 
rate(http_requests_total{service="<service>"}[5m]) * 100
```

### Order Throughput
```promql
rate(orders_created_total[1m]) * 60
```

## Service Configuration

```typescript
// src/lib/api.ts
export const SERVICES: ServiceConfig[] = [
  {
    name: 'service-name',
    displayName: 'Service Name',
    port: 3001,
    healthEndpoint: '/health',
    metricsEndpoint: '/metrics',
  },
];
```

## Environment Variables

```env
NEXT_PUBLIC_PROMETHEUS_URL=http://localhost:9090
NEXT_PUBLIC_SERVICES_BASE_URL=http://localhost
```

## Docker Commands

```bash
# Build
docker build -t admin-dashboard .

# Run
docker run -p 3100:3100 admin-dashboard

# With Docker Compose
docker-compose up admin-dashboard
```

## Troubleshooting

### Services Unhealthy
```bash
# Check services
docker-compose ps

# Test health
curl http://localhost:3001/health
```

### Prometheus Issues
```bash
# Check Prometheus
curl http://localhost:9090/-/healthy

# Check targets
open http://localhost:9090/targets
```

### CORS Errors
Add to service:
```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});
```

## Keyboard Shortcuts

- `Ctrl/Cmd + R`: Manual refresh
- `Ctrl/Cmd + K`: Toggle chaos mode (when focused)

## Status Codes

- **200**: Healthy
- **500-599**: Unhealthy
- **Timeout**: Unhealthy
- **Network Error**: Unhealthy

## Alert Thresholds

- **High Latency**: > 1000ms for 5 minutes
- **High Error Rate**: > 5% for 5 minutes
- **Low Throughput**: < 10 orders/min for 10 minutes
- **Service Down**: No response for 1 minute

## Component Props

### ServiceHealthCard
```typescript
{
  health: HealthStatus;
  latency?: number;
  requestRate?: number;
  errorRate?: number;
  onKill?: () => void;
  chaosMode?: boolean;
}
```

### MetricCard
```typescript
{
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}
```

### MetricsChart
```typescript
{
  data: any[];
  title: string;
  dataKey: string;
  color?: string;
  unit?: string;
}
```

## API Functions

```typescript
// Health
checkServiceHealth(service)
checkAllServicesHealth()

// Metrics
getAverageLatency(serviceName)
getRequestRate(serviceName)
getOrderThroughput()
getErrorRate(serviceName)

// Prometheus
queryPrometheus(query)
queryPrometheusRange(query, start, end, step)

// Chaos
killService(serviceName)
restartService(serviceName)
```

## Color Scheme

- Primary: `#2563eb` (Blue)
- Success: `#10b981` (Green)
- Warning: `#f59e0b` (Yellow)
- Error: `#ef4444` (Red)
- Info: `#6b7280` (Gray)

## File Structure

```
admin-dashboard/
├── src/
│   ├── components/
│   │   ├── MetricCard.tsx
│   │   ├── MetricsChart.tsx
│   │   └── ServiceHealthCard.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   └── store.ts
│   ├── pages/
│   │   ├── _app.tsx
│   │   ├── _document.tsx
│   │   └── index.tsx
│   └── styles/
│       └── globals.css
├── Dockerfile
├── package.json
└── README.md
```

## Performance Tips

1. Keep auto-refresh interval ≥ 5s
2. Limit time series to 20 points
3. Use parallel API calls
4. Optimize Prometheus queries
5. Enable React strict mode

## Security Checklist

- [ ] Add authentication
- [ ] Restrict chaos mode
- [ ] Use HTTPS
- [ ] Implement RBAC
- [ ] Rate limit API calls
- [ ] Validate inputs
- [ ] Sanitize outputs
- [ ] Enable CORS properly

## Support

- README: [README.md](./README.md)
- Setup: [SETUP.md](./SETUP.md)
- Implementation: [IMPLEMENTATION.md](./IMPLEMENTATION.md)
- Prometheus: https://prometheus.io/docs/
