const express = require('express');
const cors = require('cors');
const Docker = require('dockerode');
const promClient = require('prom-client');
const logger = require('./utils/logger');
const chaosController = require('./controllers/chaos.controller');
const metricsMiddleware = require('./middleware/metrics');

const app = express();
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Middleware
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

// Make docker available to controllers
app.locals.docker = docker;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// Chaos engineering routes
app.post('/chaos/kill-service', chaosController.killService);
app.post('/chaos/restart-service', chaosController.restartService);
app.post('/chaos/inject-latency', chaosController.injectLatency);
app.post('/chaos/block-network', chaosController.blockNetwork);
app.post('/chaos/simulate-broker-failure', chaosController.simulateBrokerFailure);
app.post('/chaos/inject-cpu-stress', chaosController.injectCpuStress);
app.post('/chaos/inject-memory-stress', chaosController.injectMemoryStress);
app.get('/chaos/status', chaosController.getChaosStatus);
app.post('/chaos/stop-all', chaosController.stopAllChaos);

// List available services
app.get('/services', chaosController.listServices);

// Error handling
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message,
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 3007;

app.listen(PORT, () => {
  logger.info(`Chaos Monkey service running on port ${PORT}`);
});

module.exports = app;
