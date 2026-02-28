# Admin Dashboard

Real-time monitoring dashboard for the cafeteria ordering system with service health tracking, metrics visualization, and chaos engineering capabilities.

## Features

- **Service Health Grid**: Visual status indicators (green/red) for all microservices
- **Real-time Metrics**: Live charts showing latency, throughput, and request rates
- **Average Latency Display**: Per-service and system-wide latency tracking
- **Order Throughput Counter**: Real-time orders per minute
- **Chaos Engineering**: Toggle to simulate service failures
- **Auto-refresh**: Configurable automatic data refresh (default: 5 seconds)
- **Prometheus Integration**: Direct metrics querying from Prometheus
- **Service Discovery**: Automatic detection of all microservices

## Tech Stack

- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Date Handling**: date-fns

## Prerequisites

- Node.js 20+
- Prometheus running on port 9090
- All microservices running and exposing `/health` and `/metrics` endpoints

## Installation

```bash
cd admin-dashboard
npm install
```

## Configuration

Create `.env.local`:

```env
NEXT_PUBLIC_PROMETHEUS_URL=http://localhost:9090
NEXT_PUBLIC_SERVICES_BASE_URL=http://localhost
```

## Development

```bash
npm run dev
```

Dashboard available at: http://localhost:3100

## Production Build

```bash
npm run build
npm start
```

## Docker Deployment

### Build Image

```bash
docker build -t cafeteria-admin-dashboard \
  --build-arg NEXT_PUBLIC_PROMETHEUS_URL=http://localhost:9090 \
  --build-arg NEXT_PUBLIC_SERVICES_BASE_URL=http://localhost \
  .
```

### Run Container

```bash
docker run -p 3100:3100 cafeteria-admin-dashboard
```

## Features Overview

### 1. Service Health Monitoring

Real-time health status for all services:
- Identity Provider
- Order Gateway
- Stock Service
- Kitchen Queue
- Notification Hub

Each service card shows:
- Status (Healthy/Unhealthy/Unknown)
- Response time
- Average latency
- Request rate
- Error rate (if > 0)
- Last check timestamp

### 2. System Metrics

Four key metric cards:
- **System Health**: Percentage of healthy services
- **Average Latency**: Mean response time across all services
- **Order Throughput**: Orders processed per minute
- **Request Rate**: Total requests per second

### 3. Real-time Charts

Three interactive charts:
- **Average Latency Over Time**: System-wide latency trends
- **Order Throughput Over Time**: Order processing rate
- **Total Request Rate Over Time**: Aggregate request volume

Charts update automatically and show the last 20 data points.

### 4. Chaos Engineering

Enable "Chaos Mode" to:
- Simulate service failures
- Test system resilience
- Verify monitoring alerts
- Practice incident response

Click the lightning bolt (⚡) icon on any healthy service to kill it.

### 5. Auto-refresh

- Toggle auto-refresh on/off
- Default interval: 5 seconds
- Manual refresh button available
- Shows last update timestamp

## Prometheus Metrics

The dashboard queries these Prometheus metrics:

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
rate(orders_created_total[1m])
```

## Service Discovery

Services are configured in `src/lib/api.ts`:

```typescript
export const SERVICES: ServiceConfig[] = [
  {
    name: 'identity-provider',
    displayName: 'Identity Provider',
    port: 3001,
    healthEndpoint: '/health',
    metricsEndpoint: '/metrics',
  },
  // ... more services
];
```

To add a new service:
1. Add configuration to `SERVICES` array
2. Ensure service exposes `/health` endpoint
3. Ensure service exports Prometheus metrics at `/metrics`

## API Integration

### Health Check

```typescript
import { checkServiceHealth } from '@/lib/api';

const health = await checkServiceHealth(service);
// Returns: { service, status, responseTime, timestamp, details }
```

### Metrics Query

```typescript
import { queryPrometheus } from '@/lib/api';

const result = await queryPrometheus('up{job="services"}');
```

### Chaos Engineering

```typescript
import { killService } from '@/lib/api';

await killService('order-gateway');
```

## Project Structure

```
admin-dashboard/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   ├── MetricCard.tsx
│   │   ├── MetricsChart.tsx
│   │   └── ServiceHealthCard.tsx
│   ├── lib/            # Utilities
│   │   ├── api.ts      # API client & Prometheus queries
│   │   └── store.ts    # Zustand state management
│   ├── pages/          # Next.js pages
│   │   ├── _app.tsx
│   │   ├── _document.tsx
│   │   └── index.tsx   # Main dashboard
│   └── styles/
│       └── globals.css
├── Dockerfile
├── package.json
└── README.md
```

## Monitoring Best Practices

### Health Checks

- Services should respond within 5 seconds
- Return 200 status code when healthy
- Include relevant health information in response

### Metrics

Services should expose these metrics:
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request latency histogram
- `orders_created_total` - Order creation counter (Order Gateway)
- Custom business metrics as needed

### Alerts

Set up alerts for:
- Service health failures
- High latency (> 1000ms)
- High error rate (> 5%)
- Low throughput (< expected baseline)

## Troubleshooting

### Dashboard Shows All Services Unhealthy

1. Check services are running:
   ```bash
   docker-compose ps
   ```

2. Verify service ports are accessible:
   ```bash
   curl http://localhost:3001/health
   ```

3. Check CORS configuration on services

### Prometheus Queries Failing

1. Verify Prometheus is running:
   ```bash
   curl http://localhost:9090/-/healthy
   ```

2. Check `NEXT_PUBLIC_PROMETHEUS_URL` environment variable

3. Ensure Prometheus is scraping services

### Charts Not Updating

1. Check auto-refresh is enabled
2. Verify Prometheus has data:
   ```bash
   curl 'http://localhost:9090/api/v1/query?query=up'
   ```

3. Check browser console for errors

### Chaos Mode Not Working

The chaos engineering feature requires integration with a chaos API or Docker API. Current implementation is simulated. To enable real chaos:

1. Implement chaos API endpoint
2. Update `killService()` in `src/lib/api.ts`
3. Grant necessary permissions to dashboard

## Performance

- Dashboard updates every 5 seconds by default
- Keeps last 20 data points in memory
- Minimal re-renders with React optimization
- Efficient Prometheus queries with rate functions

## Security

- Dashboard should be behind authentication in production
- Restrict chaos engineering to authorized users
- Use HTTPS for all communications
- Implement RBAC for sensitive operations

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions

## Future Enhancements

- [ ] User authentication
- [ ] Alert configuration UI
- [ ] Historical data analysis
- [ ] Custom dashboard layouts
- [ ] Export metrics to CSV
- [ ] Slack/email notifications
- [ ] Service dependency graph
- [ ] Log aggregation view
- [ ] Distributed tracing integration
- [ ] Mobile responsive improvements

## License

MIT
