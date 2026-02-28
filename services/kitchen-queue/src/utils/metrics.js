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

const orderProcessedTotal = new client.Counter({
  name: 'order_processed_total',
  help: 'Total number of orders processed',
  labelNames: ['status'],
});

const orderProcessingDuration = new client.Histogram({
  name: 'order_processing_duration_seconds',
  help: 'Duration of order processing (cooking simulation)',
  labelNames: ['status'],
  buckets: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
});

const cookingSimulationDuration = new client.Histogram({
  name: 'cooking_simulation_duration_seconds',
  help: 'Duration of cooking simulation',
  buckets: [3, 4, 5, 6, 7, 8],
});

const queueDepthGauge = new client.Gauge({
  name: 'queue_depth',
  help: 'Current depth of message queue',
  labelNames: ['queue'],
});

const activeWorkersGauge = new client.Gauge({
  name: 'active_workers',
  help: 'Number of active worker consumers',
});

const messageRetryTotal = new client.Counter({
  name: 'message_retry_total',
  help: 'Total number of message retries',
  labelNames: ['queue'],
});

const deadLetterTotal = new client.Counter({
  name: 'dead_letter_total',
  help: 'Total number of messages sent to dead letter queue',
  labelNames: ['queue', 'reason'],
});

const messageAckTotal = new client.Counter({
  name: 'message_ack_total',
  help: 'Total number of acknowledged messages',
  labelNames: ['queue'],
});

const messageNackTotal = new client.Counter({
  name: 'message_nack_total',
  help: 'Total number of rejected messages',
  labelNames: ['queue'],
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(orderProcessedTotal);
register.registerMetric(orderProcessingDuration);
register.registerMetric(cookingSimulationDuration);
register.registerMetric(queueDepthGauge);
register.registerMetric(activeWorkersGauge);
register.registerMetric(messageRetryTotal);
register.registerMetric(deadLetterTotal);
register.registerMetric(messageAckTotal);
register.registerMetric(messageNackTotal);

module.exports = {
  register,
  httpRequestDuration,
  httpRequestTotal,
  orderProcessedTotal,
  orderProcessingDuration,
  cookingSimulationDuration,
  queueDepthGauge,
  activeWorkersGauge,
  messageRetryTotal,
  deadLetterTotal,
  messageAckTotal,
  messageNackTotal,
};
