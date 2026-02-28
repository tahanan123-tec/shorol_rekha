const promClient = require('prom-client');

// Create a Registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const chaosExperimentsTotal = new promClient.Counter({
  name: 'chaos_experiments_total',
  help: 'Total number of chaos experiments executed',
  labelNames: ['type', 'service', 'status'],
});

register.registerMetric(httpRequestDuration);
register.registerMetric(chaosExperimentsTotal);

// Middleware to track request duration
module.exports = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });

  next();
};

module.exports.register = register;
module.exports.chaosExperimentsTotal = chaosExperimentsTotal;
