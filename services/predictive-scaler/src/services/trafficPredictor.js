const statistics = require('simple-statistics');
const logger = require('../utils/logger');
const db = require('../config/database');

class TrafficPredictor {
  constructor() {
    this.predictions = {};
    this.historicalData = [];
    this.accuracy = 0;
  }

  // Load historical traffic data
  async loadHistoricalData(days = 30) {
    try {
      const query = `
        SELECT 
          DATE_TRUNC('hour', timestamp) as hour,
          AVG(request_count) as avg_requests,
          MAX(request_count) as max_requests,
          AVG(cpu_usage) as avg_cpu,
          AVG(memory_usage) as avg_memory
        FROM metrics_history
        WHERE timestamp >= NOW() - INTERVAL '${days} days'
        GROUP BY hour
        ORDER BY hour
      `;
      
      const result = await db.pool.query(query);
      this.historicalData = result.rows;
      
      logger.info(`Loaded ${this.historicalData.length} historical data points`);
      return this.historicalData;
    } catch (error) {
      logger.error('Error loading historical data:', error);
      throw error;
    }
  }

  // Predict traffic for next N hours using time series analysis
  async predictTraffic(hoursAhead = 24) {
    try {
      const now = new Date();
      const predictions = [];

      for (let i = 1; i <= hoursAhead; i++) {
        const targetTime = new Date(now.getTime() + i * 60 * 60 * 1000);
        const prediction = await this.predictForTime(targetTime);
        predictions.push({
          timestamp: targetTime,
          ...prediction,
        });
      }

      this.predictions = predictions;
      return predictions;
    } catch (error) {
      logger.error('Error predicting traffic:', error);
      throw error;
    }
  }

  // Predict traffic for a specific time
  async predictForTime(targetTime) {
    const hour = targetTime.getHours();
    const dayOfWeek = targetTime.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Get historical data for same hour and day type
    const similarPeriods = this.historicalData.filter(d => {
      const dataTime = new Date(d.hour);
      const dataHour = dataTime.getHours();
      const dataDayOfWeek = dataTime.getDay();
      const dataIsWeekend = dataDayOfWeek === 0 || dataDayOfWeek === 6;
      
      return dataHour === hour && dataIsWeekend === isWeekend;
    });

    if (similarPeriods.length === 0) {
      return {
        requestsPerSecond: 10,
        confidence: 0.3,
        isPeak: false,
      };
    }

    // Calculate statistics
    const requests = similarPeriods.map(p => parseFloat(p.avg_requests));
    const mean = statistics.mean(requests);
    const stdDev = statistics.standardDeviation(requests);
    const median = statistics.median(requests);

    // Apply trend adjustment (recent data weighted more)
    const recentData = similarPeriods.slice(-5);
    const recentMean = statistics.mean(recentData.map(p => parseFloat(p.avg_requests)));
    const trendFactor = recentMean / mean;

    // Adjusted prediction
    const prediction = median * trendFactor;

    // Determine if it's peak time (5:30 PM - 6:30 PM)
    const isPeak = hour >= 17 && hour <= 18;

    // Apply peak multiplier
    const peakMultiplier = isPeak ? 3.5 : 1.0;
    const finalPrediction = prediction * peakMultiplier;

    // Calculate confidence based on data consistency
    const coefficientOfVariation = stdDev / mean;
    const confidence = Math.max(0.3, 1 - coefficientOfVariation);

    return {
      requestsPerSecond: Math.round(finalPrediction),
      confidence: Math.round(confidence * 100) / 100,
      isPeak,
      mean: Math.round(mean),
      median: Math.round(median),
      stdDev: Math.round(stdDev),
      trendFactor: Math.round(trendFactor * 100) / 100,
    };
  }

  // Get peak time prediction
  async getPeakPrediction() {
    const peakTime = new Date();
    peakTime.setHours(17, 30, 0, 0); // 5:30 PM

    if (peakTime < new Date()) {
      peakTime.setDate(peakTime.getDate() + 1);
    }

    const prediction = await this.predictForTime(peakTime);
    
    return {
      timestamp: peakTime,
      ...prediction,
      recommendedReplicas: this.calculateReplicasNeeded(prediction.requestsPerSecond),
    };
  }

  // Calculate required replicas based on predicted load
  calculateReplicasNeeded(requestsPerSecond) {
    // Assume each pod can handle 50 requests/second
    const requestsPerPod = 50;
    const baseReplicas = Math.ceil(requestsPerSecond / requestsPerPod);
    
    // Add 20% buffer for safety
    const bufferedReplicas = Math.ceil(baseReplicas * 1.2);
    
    return {
      'order-gateway': Math.max(3, Math.min(20, bufferedReplicas)),
      'stock-service': Math.max(2, Math.min(10, Math.ceil(bufferedReplicas * 0.6))),
      'kitchen-queue': Math.max(3, Math.min(15, Math.ceil(bufferedReplicas * 0.8))),
      'notification-hub': Math.max(2, Math.min(10, Math.ceil(bufferedReplicas * 0.5))),
      'identity-provider': Math.max(2, Math.min(10, Math.ceil(bufferedReplicas * 0.4))),
    };
  }

  // Update predictions
  async updatePredictions() {
    await this.loadHistoricalData();
    return await this.predictTraffic(24);
  }

  // Get current predictions
  getCurrentPredictions() {
    return this.predictions;
  }

  // Evaluate prediction accuracy
  async evaluateAccuracy() {
    try {
      // Compare predictions from 24 hours ago with actual data
      const query = `
        SELECT 
          DATE_TRUNC('hour', timestamp) as hour,
          AVG(request_count) as actual_requests
        FROM metrics_history
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY hour
        ORDER BY hour
      `;
      
      const result = await db.pool.query(query);
      const actualData = result.rows;

      if (actualData.length === 0) {
        return 0;
      }

      // Calculate Mean Absolute Percentage Error (MAPE)
      let totalError = 0;
      let count = 0;

      for (const actual of actualData) {
        const actualTime = new Date(actual.hour);
        const prediction = this.predictions.find(p => 
          new Date(p.timestamp).getHours() === actualTime.getHours()
        );

        if (prediction) {
          const error = Math.abs(
            (actual.actual_requests - prediction.requestsPerSecond) / actual.actual_requests
          );
          totalError += error;
          count++;
        }
      }

      const mape = (totalError / count) * 100;
      this.accuracy = Math.max(0, 100 - mape);

      logger.info(`Prediction accuracy: ${this.accuracy.toFixed(2)}%`);
      return this.accuracy;
    } catch (error) {
      logger.error('Error evaluating accuracy:', error);
      return 0;
    }
  }
}

module.exports = new TrafficPredictor();
