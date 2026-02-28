# Predictive Scaling Architecture

## Overview

The Predictive Scaling system uses historical traffic data and time-series analysis to anticipate peak loads and automatically prepare the infrastructure before traffic spikes occur.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Predictive Scaler Service                     │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Traffic    │  │     Auto     │  │    Cache     │          │
│  │  Predictor   │  │    Scaler    │  │    Warmer    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┼──────────────────┘                   │
│                            │                                      │
└────────────────────────────┼──────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
        ┌───────▼────────┐       ┌───────▼────────┐
        │   Kubernetes   │       │     Redis      │
        │   API Server   │       │     Cache      │
        └───────┬────────┘       └────────────────┘
                │
        ┌───────▼────────┐
        │  Deployments   │
        │  - Gateway     │
        │  - Stock       │
        │  - Kitchen     │
        │  - Notification│
        └────────────────┘
```

## Components

### 1. Traffic Predictor

**Purpose**: Analyze historical data and predict future traffic patterns

**Features**:
- Time-series analysis using statistical methods
- Pattern recognition for daily/weekly cycles
- Peak time detection (5:30 PM - 6:30 PM)
- Confidence scoring for predictions
- Trend analysis with recent data weighting

**Algorithm**:
```javascript
prediction = median(historical_data) * trend_factor * peak_multiplier
confidence = 1 - (std_dev / mean)
```

**Data Sources**:
- Prometheus metrics (request rates, latency)
- PostgreSQL metrics history table
- Real-time traffic monitoring

### 2. Auto Scaler

**Purpose**: Automatically adjust service replicas based on predictions

**Features**:
- Kubernetes API integration
- Pre-peak scaling (15 minutes before)
- Post-peak scale down
- Gradual scaling to avoid disruption
- Per-service replica calculation

**Scaling Logic**:
```javascript
replicas_needed = ceil(predicted_rps / requests_per_pod) * 1.2
replicas_capped = max(min_replicas, min(max_replicas, replicas_needed))
```

**Scaling Policies**:
- Order Gateway: 3-20 replicas
- Stock Service: 2-10 replicas
- Kitchen Queue: 3-15 replicas
- Notification Hub: 2-10 replicas
- Identity Provider: 2-10 replicas

### 3. Cache Warmer

**Purpose**: Pre-populate caches before peak traffic

**Features**:
- Menu cache warm-up
- Stock levels pre-loading
- Popular items caching
- User session pre-loading
- Parallel cache operations

**Cache Strategy**:
- Menu: 5-minute TTL
- Stock: 30-second TTL
- Popular items: 10-minute TTL
- User preferences: 1-hour TTL

### 4. Metrics Collector

**Purpose**: Gather and store historical metrics for analysis

**Metrics Collected**:
- Request count per service
- Response times
- CPU usage
- Memory usage
- Error rates
- Queue depths

**Storage**:
- PostgreSQL for long-term storage
- Redis for recent data
- Prometheus for real-time metrics

## Prediction Model

### Data Collection

```sql
CREATE TABLE metrics_history (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  service_name VARCHAR(100),
  request_count INTEGER,
  cpu_usage DECIMAL(5,2),
  memory_usage DECIMAL(5,2),
  response_time_ms INTEGER,
  INDEX idx_timestamp (timestamp),
  INDEX idx_service (service_name)
);
```

### Prediction Algorithm

1. **Historical Analysis**
   - Group data by hour and day type (weekday/weekend)
   - Calculate mean, median, standard deviation
   - Identify patterns and trends

2. **Trend Adjustment**
   - Weight recent data more heavily
   - Calculate trend factor: `recent_mean / historical_mean`
   - Apply trend to base prediction

3. **Peak Detection**
   - Identify peak hours (5:30 PM - 6:30 PM)
   - Apply peak multiplier (3.5x for Ramadan iftar)
   - Adjust for special events

4. **Confidence Scoring**
   - Calculate coefficient of variation
   - Higher consistency = higher confidence
   - Minimum confidence: 30%

### Example Prediction

```javascript
// Historical data for 5:30 PM on weekdays
historical_requests = [850, 920, 880, 910, 890] // per minute
mean = 890
median = 890
std_dev = 26.5

// Recent trend
recent_data = [910, 920, 930]
recent_mean = 920
trend_factor = 920 / 890 = 1.034

// Peak multiplier
peak_multiplier = 3.5 (Ramadan iftar time)

// Final prediction
prediction = 890 * 1.034 * 3.5 = 3,220 requests/minute
confidence = 1 - (26.5 / 890) = 0.97 (97%)
```

## Scheduling

### Cron Jobs

```javascript
// Every 5 minutes: Collect metrics
'*/5 * * * *' => metricsCollector.collect()

// Every 15 minutes: Update predictions
'*/15 * * * *' => trafficPredictor.updatePredictions()

// 5:00 PM daily: Pre-warm caches (30 min before peak)
'0 17 * * *' => cacheWarmer.warmupAll()

// 5:15 PM daily: Pre-scale services (15 min before peak)
'15 17 * * *' => autoScaler.prepareForPeak()

// 6:30 PM daily: Scale down after peak
'30 18 * * *' => autoScaler.scaleDownAfterPeak()

// Midnight daily: Evaluate accuracy
'0 0 * * *' => trafficPredictor.evaluateAccuracy()
```

### Timeline Example

```
4:45 PM - Normal operations (3 gateway replicas)
5:00 PM - Cache warm-up starts
5:05 PM - Cache warm-up completes
5:15 PM - Pre-scaling starts (scale to 15 replicas)
5:20 PM - All replicas ready
5:30 PM - Peak traffic begins (system ready!)
6:00 PM - Peak traffic continues
6:30 PM - Peak ends, scale down begins
6:45 PM - Back to baseline (3 replicas)
```

## Benefits

### 1. Proactive Scaling
- Services ready before traffic arrives
- No cold start delays
- Smooth user experience

### 2. Cost Optimization
- Scale up only when needed
- Scale down after peak
- Avoid over-provisioning

### 3. Improved Performance
- Pre-warmed caches reduce latency
- Adequate capacity prevents throttling
- Better resource utilization

### 4. Predictable Behavior
- Consistent performance during peaks
- Reduced manual intervention
- Automated operations

## Metrics & Monitoring

### Key Metrics

```promql
# Prediction accuracy
prediction_accuracy

# Scaling actions
rate(scaling_actions_total[5m])

# Cache warm-up duration
cache_warmup_duration_seconds

# Actual vs predicted traffic
abs(actual_rps - predicted_rps) / actual_rps
```

### Dashboards

1. **Prediction Dashboard**
   - Current predictions
   - Historical accuracy
   - Confidence levels
   - Trend analysis

2. **Scaling Dashboard**
   - Current replica counts
   - Scaling history
   - Resource utilization
   - Cost tracking

3. **Cache Dashboard**
   - Cache hit rates
   - Warm-up success rate
   - Cache size
   - TTL effectiveness

## Configuration

### Environment Variables

```bash
# Service URLs
ORDER_GATEWAY_URL=http://order-gateway-service:3002
STOCK_SERVICE_URL=http://stock-service:3003

# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/cafeteria_db

# Redis
REDIS_URL=redis://redis-service:6379

# Kubernetes
K8S_NAMESPACE=cafeteria-system

# Prediction Settings
PREDICTION_WINDOW_HOURS=24
HISTORICAL_DATA_DAYS=30
PEAK_START_HOUR=17
PEAK_END_HOUR=18
PEAK_MULTIPLIER=3.5

# Scaling Settings
MIN_REPLICAS_GATEWAY=3
MAX_REPLICAS_GATEWAY=20
REQUESTS_PER_POD=50
SCALE_UP_BUFFER=1.2

# Cache Settings
CACHE_WARMUP_ENABLED=true
CACHE_TTL_MENU=300
CACHE_TTL_STOCK=30
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: predictive-scaler
  namespace: cafeteria-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: predictive-scaler
  template:
    metadata:
      labels:
        app: predictive-scaler
    spec:
      serviceAccountName: predictive-scaler-sa
      containers:
      - name: predictive-scaler
        image: cafeteria/predictive-scaler:1.0.0
        ports:
        - containerPort: 3007
        env:
        - name: NODE_ENV
          value: "production"
        - name: K8S_NAMESPACE
          value: "cafeteria-system"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: predictive-scaler-sa
  namespace: cafeteria-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: predictive-scaler-role
  namespace: cafeteria-system
rules:
- apiGroups: ["apps"]
  resources: ["deployments", "deployments/scale"]
  verbs: ["get", "list", "patch", "update"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: predictive-scaler-binding
  namespace: cafeteria-system
subjects:
- kind: ServiceAccount
  name: predictive-scaler-sa
roleRef:
  kind: Role
  name: predictive-scaler-role
  apiGroup: rbac.authorization.k8s.io
```

## API Endpoints

### GET /predictions
Get current traffic predictions

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2024-01-15T17:30:00Z",
      "requestsPerSecond": 3220,
      "confidence": 0.97,
      "isPeak": true,
      "mean": 890,
      "median": 890,
      "trendFactor": 1.034
    }
  ]
}
```

### GET /recommendations
Get scaling recommendations

**Response**:
```json
{
  "success": true,
  "data": {
    "action": "scale-up",
    "prediction": {...},
    "recommendedReplicas": {
      "order-gateway": 15,
      "stock-service": 8,
      "kitchen-queue": 12
    },
    "confidence": 0.97
  }
}
```

### POST /warmup
Manually trigger cache warm-up

**Response**:
```json
{
  "success": true,
  "data": {
    "menu": { "status": "success", "itemsCount": 45 },
    "stock": { "status": "success", "itemsCount": 45 },
    "popular": { "status": "success", "itemsCount": 10 }
  }
}
```

### POST /scale
Manually scale a service

**Request**:
```json
{
  "service": "order-gateway",
  "replicas": 10
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "service": "order-gateway",
    "replicas": 10,
    "status": "success"
  }
}
```

## Testing

### Load Testing

```bash
# Generate baseline load
artillery run load-test.yml

# Verify predictions
curl http://predictive-scaler:3007/predictions

# Trigger manual scaling
curl -X POST http://predictive-scaler:3007/scale \
  -d '{"service": "order-gateway", "replicas": 15}'

# Monitor scaling
kubectl get hpa -n cafeteria-system -w
```

### Accuracy Testing

```bash
# Run for 7 days to collect data
# Check accuracy daily
curl http://predictive-scaler:3007/metrics | grep prediction_accuracy
```

## Troubleshooting

### Low Prediction Accuracy

**Causes**:
- Insufficient historical data
- Irregular traffic patterns
- External events not accounted for

**Solutions**:
- Collect more data (30+ days)
- Adjust peak multiplier
- Add event calendar integration

### Scaling Too Slow

**Causes**:
- Kubernetes resource limits
- Image pull delays
- Pod startup time

**Solutions**:
- Pre-pull images on nodes
- Increase resource limits
- Use faster storage class

### Cache Warm-up Failures

**Causes**:
- Service unavailable
- Network timeouts
- Redis connection issues

**Solutions**:
- Add retries with backoff
- Increase timeouts
- Check service health

## Future Enhancements

- [ ] Machine learning models (LSTM, Prophet)
- [ ] Multi-region prediction
- [ ] Event calendar integration
- [ ] Weather data correlation
- [ ] A/B testing for algorithms
- [ ] Real-time prediction updates
- [ ] Anomaly detection
- [ ] Cost prediction and optimization

---

**Status**: ✅ Complete and Ready for Production

The predictive scaling system is fully implemented and ready to handle peak traffic with proactive preparation.
