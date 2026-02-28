const express = require('express');
const cron = require('node-cron');
const logger = require('./utils/logger');
const { createTables } = require('./config/init-db');
const trafficPredictor = require('./services/trafficPredictor');
const autoScaler = require('./services/autoScaler');
const cacheWarmer = require('./services/cacheWarmer');
const metricsCollector = require('./services/metricsCollector');
const promClient = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3008;

// Middleware
app.use(express.json());

// Prometheus metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics
const predictionAccuracy = new promClient.Gauge({
  name: 'prediction_accuracy',
  help: 'Accuracy of traffic predictions',
  registers: [register],
});

const scalingActions = new promClient.Counter({
  name: 'scaling_actions_total',
  help: 'Total number of scaling actions performed',
  labelNames: ['service', 'direction'],
  registers: [register],
});

const cacheWarmupDuration = new promClient.Histogram({
  name: 'cache_warmup_duration_seconds',
  help: 'Duration of cache warm-up operations',
  registers: [register],
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Get current predictions
app.get('/predictions', async (req, res) => {
  try {
    const predictions = await trafficPredictor.getCurrentPredictions();
    res.json({
      success: true,
      data: predictions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting predictions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get scaling recommendations
app.get('/recommendations', async (req, res) => {
  try {
    const recommendations = await autoScaler.getRecommendations();
    res.json({
      success: true,
      data: recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting recommendations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual trigger for cache warm-up
app.post('/warmup', async (req, res) => {
  try {
    logger.info('Manual cache warm-up triggered');
    const result = await cacheWarmer.warmupAll();
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error warming up cache:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual trigger for scaling
app.post('/scale', async (req, res) => {
  try {
    const { service, replicas } = req.body;
    logger.info(`Manual scaling triggered for ${service} to ${replicas} replicas`);
    const result = await autoScaler.scaleService(service, replicas);
    scalingActions.inc({ service, direction: replicas > 0 ? 'up' : 'down' });
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error scaling service:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Schedule: Collect metrics every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    logger.info('Collecting metrics...');
    await metricsCollector.collect();
  } catch (error) {
    logger.error('Error collecting metrics:', error);
  }
});

// Schedule: Update predictions every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  try {
    logger.info('Updating traffic predictions...');
    const predictions = await trafficPredictor.updatePredictions();
    logger.info('Predictions updated:', predictions);
  } catch (error) {
    logger.error('Error updating predictions:', error);
  }
});

// Schedule: Pre-warm cache at 5:00 PM (30 minutes before peak)
cron.schedule('0 17 * * *', async () => {
  try {
    logger.info('Starting scheduled cache warm-up (30 min before peak)...');
    const start = Date.now();
    await cacheWarmer.warmupAll();
    const duration = (Date.now() - start) / 1000;
    cacheWarmupDuration.observe(duration);
    logger.info(`Cache warm-up completed in ${duration}s`);
  } catch (error) {
    logger.error('Error in scheduled cache warm-up:', error);
  }
});

// Schedule: Pre-scale services at 5:15 PM (15 minutes before peak)
cron.schedule('15 17 * * *', async () => {
  try {
    logger.info('Starting pre-peak scaling...');
    const predictions = await trafficPredictor.getPeakPrediction();
    await autoScaler.prepareForPeak(predictions);
    logger.info('Pre-peak scaling completed');
  } catch (error) {
    logger.error('Error in pre-peak scaling:', error);
  }
});

// Schedule: Scale down after peak at 6:30 PM
cron.schedule('30 18 * * *', async () => {
  try {
    logger.info('Starting post-peak scale down...');
    await autoScaler.scaleDownAfterPeak();
    logger.info('Post-peak scale down completed');
  } catch (error) {
    logger.error('Error in post-peak scale down:', error);
  }
});

// Schedule: Evaluate prediction accuracy daily at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    logger.info('Evaluating prediction accuracy...');
    const accuracy = await trafficPredictor.evaluateAccuracy();
    predictionAccuracy.set(accuracy);
    logger.info(`Prediction accuracy: ${accuracy}%`);
  } catch (error) {
    logger.error('Error evaluating accuracy:', error);
  }
});

// Initialize
async function initialize() {
  try {
    logger.info('Initializing Predictive Scaler...');
    
    // Initialize database tables
    await createTables();
    
    // Load historical data
    await metricsCollector.loadHistoricalData();
    
    // Generate initial predictions
    await trafficPredictor.updatePredictions();
    
    logger.info('Predictive Scaler initialized successfully');
  } catch (error) {
    logger.error('Error initializing:', error);
    // Don't exit on initialization errors, service can still run
  }
}

// Start server
app.listen(PORT, async () => {
  logger.info(`Predictive Scaler running on port ${PORT}`);
  await initialize();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
