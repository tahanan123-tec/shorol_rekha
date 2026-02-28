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

const websocketConnectionsGauge = new client.Gauge({
  name: 'websocket_connections',
  help: 'Number of active WebSocket connections',
});

const websocketConnectionTotal = new client.Counter({
  name: 'websocket_connection_total',
  help: 'Total number of WebSocket connections',
  labelNames: ['status'],
});

const notificationSentTotal = new client.Counter({
  name: 'notification_sent_total',
  help: 'Total number of notifications sent',
  labelNames: ['event_type', 'status'],
});

const notificationLatency = new client.Histogram({
  name: 'notification_latency_seconds',
  help: 'Latency of notification delivery',
  labelNames: ['event_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

const messageProcessedTotal = new client.Counter({
  name: 'message_processed_total',
  help: 'Total number of messages processed from queue',
  labelNames: ['queue', 'status'],
});

const activeRoomsGauge = new client.Gauge({
  name: 'active_rooms',
  help: 'Number of active Socket.IO rooms',
});

const broadcastTotal = new client.Counter({
  name: 'broadcast_total',
  help: 'Total number of broadcasts',
  labelNames: ['room'],
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(websocketConnectionsGauge);
register.registerMetric(websocketConnectionTotal);
register.registerMetric(notificationSentTotal);
register.registerMetric(notificationLatency);
register.registerMetric(messageProcessedTotal);
register.registerMetric(activeRoomsGauge);
register.registerMetric(broadcastTotal);

module.exports = {
  register,
  httpRequestDuration,
  httpRequestTotal,
  websocketConnectionsGauge,
  websocketConnectionTotal,
  notificationSentTotal,
  notificationLatency,
  messageProcessedTotal,
  activeRoomsGauge,
  broadcastTotal,
};
