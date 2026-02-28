const client = require('prom-client');

const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const cacheHitTotal = new client.Counter({
  name: 'cache_hit_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
});

const cacheMissTotal = new client.Counter({
  name: 'cache_miss_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
});

const orderProcessingDuration = new client.Histogram({
  name: 'order_processing_duration_seconds',
  help: 'Duration of order processing in seconds',
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2],
});

const orderCreatedTotal = new client.Counter({
  name: 'order_created_total',
  help: 'Total number of orders created',
  labelNames: ['status'],
});

const stockCheckDuration = new client.Histogram({
  name: 'stock_check_duration_seconds',
  help: 'Duration of stock check in seconds',
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});

const circuitBreakerStateGauge = new client.Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
  labelNames: ['service'],
});

const externalServiceCallDuration = new client.Histogram({
  name: 'external_service_call_duration_seconds',
  help: 'Duration of external service calls in seconds',
  labelNames: ['service', 'endpoint', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const idempotencyCheckTotal = new client.Counter({
  name: 'idempotency_check_total',
  help: 'Total number of idempotency checks',
  labelNames: ['result'],
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(cacheHitTotal);
register.registerMetric(cacheMissTotal);
register.registerMetric(orderProcessingDuration);
register.registerMetric(orderCreatedTotal);
register.registerMetric(stockCheckDuration);
register.registerMetric(circuitBreakerStateGauge);
register.registerMetric(externalServiceCallDuration);
register.registerMetric(idempotencyCheckTotal);

module.exports = {
  register,
  httpRequestDuration,
  httpRequestTotal,
  cacheHitTotal,
  cacheMissTotal,
  orderProcessingDuration,
  orderCreatedTotal,
  stockCheckDuration,
  circuitBreakerStateGauge,
  externalServiceCallDuration,
  idempotencyCheckTotal,
};
