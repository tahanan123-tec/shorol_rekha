const axios = require('axios');
const logger = require('../utils/logger');

class MetricsCollector {
  constructor() {
    this.prometheusUrl = process.env.PROMETHEUS_URL || 'http://localhost:9090';
  }

  async collectMetrics() {
    try {
      const metrics = {
        timestamp: new Date(),
        cpu: await this.getCPUMetrics(),
        memory: await this.getMemoryMetrics(),
        requests: await this.getRequestMetrics(),
      };
      
      return metrics;
    } catch (error) {
      logger.error('Failed to collect metrics', { error: error.message });
      return null;
    }
  }

  async getCPUMetrics() {
    try {
      const response = await axios.get(`${this.prometheusUrl}/api/v1/query`, {
        params: {
          query: 'rate(process_cpu_seconds_total[5m])',
        },
      });
      return response.data.data.result;
    } catch (error) {
      logger.warn('Failed to get CPU metrics', { error: error.message });
      return [];
    }
  }

  async getMemoryMetrics() {
    try {
      const response = await axios.get(`${this.prometheusUrl}/api/v1/query`, {
        params: {
          query: 'process_resident_memory_bytes',
        },
      });
      return response.data.data.result;
    } catch (error) {
      logger.warn('Failed to get memory metrics', { error: error.message });
      return [];
    }
  }

  async getRequestMetrics() {
    try {
      const response = await axios.get(`${this.prometheusUrl}/api/v1/query`, {
        params: {
          query: 'rate(http_requests_total[5m])',
        },
      });
      return response.data.data.result;
    } catch (error) {
      logger.warn('Failed to get request metrics', { error: error.message });
      return [];
    }
  }

  async loadHistoricalData() {
    try {
      logger.info('Loading historical metrics data...');
      const metrics = await this.collectMetrics();
      logger.info('Historical data loaded successfully');
      return metrics;
    } catch (error) {
      logger.error('Failed to load historical data', { error: error.message });
      return null;
    }
  }
}

module.exports = new MetricsCollector();
