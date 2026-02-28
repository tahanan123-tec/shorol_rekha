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

const stockReservationTotal = new client.Counter({
  name: 'stock_reservation_total',
  help: 'Total number of stock reservations',
  labelNames: ['status', 'item_id'],
});

const stockReservationDuration = new client.Histogram({
  name: 'stock_reservation_duration_seconds',
  help: 'Duration of stock reservation operations',
  labelNames: ['status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});

const stockLevelGauge = new client.Gauge({
  name: 'stock_level',
  help: 'Current stock level by item',
  labelNames: ['item_id', 'item_name'],
});

const optimisticLockRetryTotal = new client.Counter({
  name: 'optimistic_lock_retry_total',
  help: 'Total number of optimistic lock retries',
  labelNames: ['operation'],
});

const optimisticLockFailureTotal = new client.Counter({
  name: 'optimistic_lock_failure_total',
  help: 'Total number of optimistic lock failures',
  labelNames: ['operation'],
});

const concurrentRequestsGauge = new client.Gauge({
  name: 'concurrent_requests',
  help: 'Number of concurrent requests being processed',
});

const stockTransactionTotal = new client.Counter({
  name: 'stock_transaction_total',
  help: 'Total number of stock transactions',
  labelNames: ['type', 'status'],
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(stockReservationTotal);
register.registerMetric(stockReservationDuration);
register.registerMetric(stockLevelGauge);
register.registerMetric(optimisticLockRetryTotal);
register.registerMetric(optimisticLockFailureTotal);
register.registerMetric(concurrentRequestsGauge);
register.registerMetric(stockTransactionTotal);

module.exports = {
  register,
  httpRequestDuration,
  httpRequestTotal,
  stockReservationTotal,
  stockReservationDuration,
  stockLevelGauge,
  optimisticLockRetryTotal,
  optimisticLockFailureTotal,
  concurrentRequestsGauge,
  stockTransactionTotal,
};
