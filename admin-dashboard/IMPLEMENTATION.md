# Admin Dashboard Implementation Details

Technical implementation guide for the admin monitoring dashboard.

## Architecture

### Component Hierarchy

```
AdminDashboard (index.tsx)
├── Header
│   ├── Logo & Title
│   ├── Chaos Mode Toggle
│   ├── Auto-refresh Toggle
│   └── Manual Refresh Button
├── Overall Metrics (4 MetricCards)
│   ├── System Health
│   ├── Average Latency
│   ├── Order Throughput
│   └── Request Rate
├── Service Health Grid (5 ServiceHealthCards)
│   ├── Identity Provider
│   ├── Order Gateway
│   ├── Stock Service
│   ├── Kitchen Queue
│   └── Notification Hub
├── Charts (3 MetricsCharts)
│   ├── Average Latency Over Time
│   ├── Order Throughput Over Time
│   └── Total Request Rate Over Time
└── Alerts
    ├── High Error Rate Warning
    └── Service Degradation Warning
```

### State Management

Using Zustand for global state:

```typescript
interface DashboardState {
  healthStatuses: HealthStatus[];      // Current health of all services
  autoRefresh: boolean;                // Auto-refresh enabled/disabled
  refreshInterval: number;             // Refresh interval in ms
  chaosMode: boolean;                  // Chaos engineering mode
}
```

### Data Flow

1. **Initial Load**
   - Fetch health status for all services
   - Query Prometheus for metrics
   - Initialize time series data

2. **Auto-refresh Cycle** (every 5s)
   - Check service health via `/health` endpoints
   - Query Prometheus for latest metrics
   - Update time series data (keep last 20 points)
   - Re-render components

3. **User Interactions**
   - Toggle auto-refresh
   - Manual refresh
   - Enable/disable chaos mode
   - Kill service (chaos mode)

## API Integration

### Health Check Implementation

```typescript
export const checkServiceHealth = async (service: ServiceConfig): Promise<HealthStatus> => {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(
      `${SERVICES_BASE_URL}:${service.port}${service.healthEndpoint}`,
      { timeout: 5000 }
    );
    
    return {
      service: service.name,
      status: response.status === 200 ? 'healthy' : 'unhealthy',
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      details: response.data,
    };
  } catch (error) {
    return {
      service: service.name,
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      details: { error: error.message },
    };
  }
};
```

### Prometheus Query Implementation

```typescript
export const queryPrometheus = async (query: string): Promise<PrometheusResponse> => {
  const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
    params: { query },
    timeout: 10000,
  });
  return response.data;
};
```

### Metrics Calculation

**Average Latency:**
```promql
rate(http_request_duration_seconds_sum{service="<service>"}[5m]) / 
rate(http_request_duration_seconds_count{service="<service>"}[5m])
```

**Request Rate:**
```promql
rate(http_requests_total{service="<service>"}[1m])
```

**Error Rate:**
```promql
rate(http_requests_total{service="<service>",status=~"5.."}[5m]) / 
rate(http_requests_total{service="<service>"}[5m]) * 100
```

**Order Throughput:**
```promql
rate(orders_created_total[1m]) * 60
```

## Component Implementation

### ServiceHealthCard

Displays health status for a single service:

```typescript
interface ServiceHealthCardProps {
  health: HealthStatus;
  latency?: number;
  requestRate?: number;
  errorRate?: number;
  onKill?: () => void;
  chaosMode?: boolean;
}
```

Features:
- Color-coded status (green/red/gray)
- Response time display
- Average latency
- Request rate
- Error rate (if > 0)
- Chaos mode kill button
- Last check timestamp

### MetricCard

Displays a single metric with icon:

```typescript
interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}
```

Features:
- Large value display
- Icon with color background
- Optional trend indicator
- Unit display

### MetricsChart

Line chart for time series data:

```typescript
interface MetricsChartProps {
  data: any[];
  title: string;
  dataKey: string;
  color?: string;
  unit?: string;
}
```

Features:
- Responsive container
- Time-formatted X-axis
- Tooltip with formatted values
- Smooth line animation
- Grid background

## Performance Optimizations

### 1. Efficient Re-renders

```typescript
// Only update when data changes
useEffect(() => {
  refreshData();
}, [autoRefresh, refreshInterval]);
```

### 2. Parallel API Calls

```typescript
// Fetch all metrics in parallel
const metrics = await Promise.all([
  getAverageLatency(service.name),
  getRequestRate(service.name),
  getErrorRate(service.name),
]);
```

### 3. Data Point Limiting

```typescript
// Keep only last 20 data points
setTimeSeriesData((prev) => {
  const newData = [...prev, newPoint];
  return newData.slice(-20);
});
```

### 4. Debounced Updates

Auto-refresh interval prevents excessive API calls.

## Error Handling

### Service Health Errors

```typescript
try {
  const response = await axios.get(healthEndpoint);
  return { status: 'healthy', ... };
} catch (error) {
  return { status: 'unhealthy', details: { error: error.message } };
}
```

### Prometheus Query Errors

```typescript
try {
  const result = await queryPrometheus(query);
  return parseFloat(result.data.result[0].value[1]);
} catch (error) {
  console.error('Prometheus query error:', error);
  return 0; // Return default value
}
```

### User Notifications

```typescript
import toast from 'react-hot-toast';

// Success
toast.success('Service killed successfully');

// Error
toast.error('Failed to fetch metrics');

// Info
toast('Chaos mode enabled', { icon: '⚡' });
```

## Chaos Engineering

### Kill Service Implementation

```typescript
export const killService = async (serviceName: string): Promise<boolean> => {
  try {
    // In production, call chaos API:
    // await axios.post(`${CHAOS_API_URL}/kill`, { service: serviceName });
    
    console.warn(`Chaos: Killing service ${serviceName}`);
    return true;
  } catch (error) {
    console.error(`Error killing service ${serviceName}:`, error);
    return false;
  }
};
```

### Integration with Docker

To enable real chaos engineering:

```bash
# Install Docker SDK
npm install dockerode

# Implement kill service
import Docker from 'dockerode';

const docker = new Docker();

export const killService = async (serviceName: string) => {
  const container = docker.getContainer(serviceName);
  await container.kill();
};
```

### Safety Measures

1. Confirmation dialog before killing
2. Only available in chaos mode
3. Only for healthy services
4. Logged for audit trail

## Styling

### Tailwind CSS Classes

**Status Colors:**
- Healthy: `bg-green-100 border-green-300 text-green-800`
- Unhealthy: `bg-red-100 border-red-300 text-red-800`
- Unknown: `bg-gray-100 border-gray-300 text-gray-800`

**Metric Colors:**
- Blue: `bg-blue-100 text-blue-600`
- Green: `bg-green-100 text-green-600`
- Red: `bg-red-100 text-red-600`
- Yellow: `bg-yellow-100 text-yellow-600`
- Purple: `bg-purple-100 text-purple-600`

### Responsive Design

```css
/* Mobile first */
grid-cols-1

/* Tablet */
md:grid-cols-2

/* Desktop */
lg:grid-cols-3

/* Large desktop */
xl:grid-cols-5
```

## Testing

### Manual Testing Checklist

- [ ] All services show correct health status
- [ ] Metrics update every 5 seconds
- [ ] Charts display data correctly
- [ ] Auto-refresh toggle works
- [ ] Manual refresh works
- [ ] Chaos mode toggle works
- [ ] Kill service button works (chaos mode)
- [ ] Alerts appear for unhealthy services
- [ ] Alerts appear for high error rates
- [ ] Responsive on mobile devices

### Integration Testing

```typescript
// Test health check
const health = await checkServiceHealth(SERVICES[0]);
expect(health.status).toBe('healthy');

// Test Prometheus query
const result = await queryPrometheus('up');
expect(result.status).toBe('success');

// Test metrics calculation
const latency = await getAverageLatency('order-gateway');
expect(latency).toBeGreaterThan(0);
```

## Deployment

### Environment Variables

```env
# Development
NEXT_PUBLIC_PROMETHEUS_URL=http://localhost:9090
NEXT_PUBLIC_SERVICES_BASE_URL=http://localhost

# Production
NEXT_PUBLIC_PROMETHEUS_URL=https://prometheus.yourdomain.com
NEXT_PUBLIC_SERVICES_BASE_URL=https://api.yourdomain.com
```

### Docker Build

```dockerfile
# Build with environment variables
ARG NEXT_PUBLIC_PROMETHEUS_URL
ARG NEXT_PUBLIC_SERVICES_BASE_URL

ENV NEXT_PUBLIC_PROMETHEUS_URL=$NEXT_PUBLIC_PROMETHEUS_URL
ENV NEXT_PUBLIC_SERVICES_BASE_URL=$NEXT_PUBLIC_SERVICES_BASE_URL
```

### Docker Compose

```yaml
admin-dashboard:
  build:
    context: ./admin-dashboard
    args:
      NEXT_PUBLIC_PROMETHEUS_URL: http://prometheus:9090
      NEXT_PUBLIC_SERVICES_BASE_URL: http://localhost
  ports:
    - "3100:3100"
  depends_on:
    - prometheus
```

## Monitoring the Dashboard

### Key Metrics

- Page load time
- API response times
- Error rates
- User sessions
- Refresh frequency

### Logging

```typescript
// Log important events
console.log('Dashboard initialized');
console.log('Health check completed:', healthStatuses);
console.error('Prometheus query failed:', error);
console.warn('Chaos: Killing service', serviceName);
```

## Future Enhancements

### 1. Authentication

```typescript
// Add auth middleware
export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  if (!token) {
    return NextResponse.redirect('/login');
  }
}
```

### 2. Custom Dashboards

Allow users to create custom dashboard layouts with drag-and-drop.

### 3. Alert Configuration

UI for configuring Prometheus alerts without editing YAML.

### 4. Historical Data

Store and display historical metrics data for trend analysis.

### 5. Log Aggregation

Integrate with ELK stack or similar for log viewing.

### 6. Distributed Tracing

Integrate with Jaeger for request tracing across services.

## Troubleshooting

### Common Issues

**Issue**: CORS errors
**Solution**: Add CORS headers to service responses

**Issue**: Prometheus queries timeout
**Solution**: Optimize queries, increase timeout

**Issue**: Charts not updating
**Solution**: Check auto-refresh is enabled, verify Prometheus has data

**Issue**: Services show as unhealthy
**Solution**: Verify services are running, check network connectivity

## Best Practices

1. **Keep queries efficient**: Use rate() and aggregation
2. **Limit data points**: Store only recent data in memory
3. **Handle errors gracefully**: Always return default values
4. **Use TypeScript**: Catch type errors at compile time
5. **Optimize re-renders**: Use React.memo and useCallback
6. **Monitor the monitor**: Track dashboard performance
7. **Document changes**: Update docs when adding features

## License

MIT
