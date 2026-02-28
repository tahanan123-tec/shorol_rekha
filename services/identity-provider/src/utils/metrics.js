const client = require('prom-client');

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const loginAttemptsTotal = new client.Counter({
  name: 'login_attempts_total',
  help: 'Total number of login attempts',
  labelNames: ['status'],
});

const rateLimitHitsTotal = new client.Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['student_id'],
});

const activeTokensGauge = new client.Gauge({
  name: 'active_tokens_gauge',
  help: 'Number of active tokens',
});

const tokenGenerationDuration = new client.Histogram({
  name: 'token_generation_duration_seconds',
  help: 'Duration of token generation in seconds',
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(loginAttemptsTotal);
register.registerMetric(rateLimitHitsTotal);
register.registerMetric(activeTokensGauge);
register.registerMetric(tokenGenerationDuration);

module.exports = {
  register,
  httpRequestDuration,
  httpRequestTotal,
  loginAttemptsTotal,
  rateLimitHitsTotal,
  activeTokensGauge,
  tokenGenerationDuration,
};
