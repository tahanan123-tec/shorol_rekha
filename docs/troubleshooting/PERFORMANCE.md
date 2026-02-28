# System Performance Analysis - 200+ Users/Second

## Current Configuration Analysis

### Current Setup (Single Instance)
Your current Docker deployment runs **1 instance** of each service:
- 1x Identity Provider
- 1x Order Gateway
- 1x Stock Service
- 1x Kitchen Queue
- 1x Notification Hub
- 1x PostgreSQL
- 1x Redis
- 1x RabbitMQ
- 1x NGINX

### Theoretical Capacity

**Current Estimated Capacity: ~50-100 requests/second**

#### Bottlenecks:

1. **Database Connections**
   - PostgreSQL pool: 50 connections max
   - Single instance handling all queries
   - Estimated: 100-200 req/s max

2. **Node.js Services**
   - Single-threaded event loop
   - CPU-bound operations (bcrypt hashing)
   - Estimated: 50-100 req/s per instance

3. **NGINX Rate Limiting**
   - Current: 100 req/s global limit
   - Login: 3 req/min per IP (too restrictive!)
   - API: 50 req/s

4. **Redis**
   - Can handle 100k+ ops/sec
   - Not a bottleneck ✅

5. **RabbitMQ**
   - Can handle 10k+ msg/sec
   - Not a bottleneck ✅

## Can It Handle 200 Users/Second?

### Short Answer: **NO** (current setup)

### Why Not?

1. **Single service instances** - No horizontal scaling
2. **Rate limiting too restrictive** - NGINX blocks at 100 req/s
3. **Database connection pool** - Limited to 50 connections
4. **No load balancing** - Single point of failure
5. **CPU-intensive operations** - Bcrypt hashing on single thread

## How to Achieve 200+ Requests/Second

### Option 1: Quick Wins (Minimal Changes)

#### 1.1 Update NGINX Rate Limits
```nginx
# Current (too restrictive)
limit_req_zone $binary_remote_addr zone=global_limit:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=50r/s;

# Recommended for 200 req/s
limit_req_zone $binary_remote_addr zone=global_limit:10m rate=500r/s;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=300r/s;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=10r/s;  # Up from 3r/m
```

#### 1.2 Scale Services Horizontally
```yaml
# docker-compose.local.yml
services:
  identity-provider:
    deploy:
      replicas: 3  # 3 instances
  
  order-gateway:
    deploy:
      replicas: 3
  
  stock-service:
    deploy:
      replicas: 3
```

#### 1.3 Increase Database Pool
```javascript
// services/*/src/config/database.js
const pool = new Pool({
  max: 100,  // Up from 50
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```

**Expected Result: ~150-200 req/s** ✅

### Option 2: Production-Ready (Kubernetes)

#### 2.1 Horizontal Pod Autoscaling
```yaml
# k8s/deployments/identity-provider.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: identity-provider-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: identity-provider
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

#### 2.2 Database Read Replicas
```yaml
# PostgreSQL with read replicas
postgres-primary:
  image: postgres:15-alpine
  
postgres-replica-1:
  image: postgres:15-alpine
  environment:
    POSTGRES_REPLICATION_MODE: slave
    POSTGRES_MASTER_HOST: postgres-primary
```

#### 2.3 Redis Cluster
```yaml
# Redis cluster for high availability
redis-cluster:
  image: redis:7-alpine
  command: redis-server --cluster-enabled yes
  deploy:
    replicas: 6
```

**Expected Result: 500-1000+ req/s** ✅

### Option 3: Optimize Code

#### 3.1 Reduce Bcrypt Rounds
```javascript
// services/identity-provider/src/services/auth.service.js
// Current: 12 rounds (slow but secure)
const hashedPassword = await bcrypt.hash(password, 12);

// Recommended for high load: 10 rounds
const hashedPassword = await bcrypt.hash(password, 10);
```

#### 3.2 Add Caching Layer
```javascript
// Cache user lookups
const cachedUser = await redis.get(`user:${student_id}`);
if (cachedUser) return JSON.parse(cachedUser);

const user = await db.query('SELECT * FROM users WHERE student_id = $1', [student_id]);
await redis.setex(`user:${student_id}`, 300, JSON.stringify(user));
```

#### 3.3 Connection Pooling
```javascript
// Use connection pooling for all services
const pool = new Pool({
  max: 100,
  min: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});
```

## Recommended Implementation Plan

### Phase 1: Immediate (1-2 hours)
1. ✅ Update NGINX rate limits
2. ✅ Increase database connection pools
3. ✅ Scale to 3 replicas per service
4. ✅ Add health checks and monitoring

**Target: 150-200 req/s**

### Phase 2: Short-term (1-2 days)
1. ✅ Implement Redis caching for reads
2. ✅ Optimize bcrypt rounds
3. ✅ Add database indexes
4. ✅ Implement connection pooling

**Target: 300-400 req/s**

### Phase 3: Long-term (1-2 weeks)
1. ✅ Deploy to Kubernetes
2. ✅ Implement auto-scaling
3. ✅ Add database read replicas
4. ✅ Implement Redis cluster
5. ✅ Add CDN for static assets

**Target: 1000+ req/s**

## Load Testing

### Test Current Capacity
```bash
# Install Apache Bench
apt-get install apache2-utils

# Test login endpoint
ab -n 1000 -c 50 -p login.json -T application/json http://localhost/auth/login

# Test stock endpoint
ab -n 10000 -c 100 http://localhost/stock
```

### Expected Results (Current Setup)
```
Requests per second:    50-80 [#/sec]
Time per request:       12-20 [ms]
Failed requests:        High (rate limiting)
```

### Expected Results (After Scaling)
```
Requests per second:    200-300 [#/sec]
Time per request:       3-5 [ms]
Failed requests:        Low (<1%)
```

## Cost Considerations

### Current Setup (Local Docker)
- Cost: $0 (local machine)
- Capacity: ~50-100 req/s
- Suitable for: Development, testing

### Scaled Docker (3 replicas)
- Cost: $50-100/month (VPS)
- Capacity: ~150-200 req/s
- Suitable for: Small production

### Kubernetes (Auto-scaling)
- Cost: $200-500/month (managed K8s)
- Capacity: 500-1000+ req/s
- Suitable for: Production at scale

## Monitoring & Alerts

### Key Metrics to Track
1. **Request Rate** - Current req/s
2. **Response Time** - p50, p95, p99
3. **Error Rate** - 4xx, 5xx errors
4. **CPU Usage** - Per service
5. **Memory Usage** - Per service
6. **Database Connections** - Active/idle
7. **Queue Depth** - RabbitMQ messages

### Grafana Dashboards
Already configured at: http://localhost:3200
- System Overview
- Service Details
- Database Performance
- Queue Metrics

## Conclusion

### Current State
❌ **Cannot handle 200 req/s** with single instances

### After Quick Wins (Phase 1)
✅ **Can handle 150-200 req/s** with 3 replicas + config changes

### After Optimization (Phase 2)
✅ **Can handle 300-400 req/s** with caching + optimization

### Production Ready (Phase 3)
✅ **Can handle 1000+ req/s** with Kubernetes + auto-scaling

## Next Steps

1. **Run load tests** to establish baseline
2. **Implement Phase 1** changes (quick wins)
3. **Monitor metrics** in Grafana
4. **Iterate and optimize** based on results
5. **Plan Kubernetes migration** for production

Would you like me to implement Phase 1 changes now?
