const k8s = require('@kubernetes/client-node');
const logger = require('../utils/logger');
const trafficPredictor = require('./trafficPredictor');

class AutoScaler {
  constructor() {
    this.kc = new k8s.KubeConfig();
    this.kc.loadFromDefault();
    this.k8sApi = this.kc.makeApiClient(k8s.AppsV1Api);
    this.namespace = process.env.K8S_NAMESPACE || 'cafeteria-system';
    this.currentScaling = {};
  }

  // Scale a specific service
  async scaleService(serviceName, replicas) {
    try {
      logger.info(`Scaling ${serviceName} to ${replicas} replicas`);

      const deploymentName = this.getDeploymentName(serviceName);
      
      // Get current deployment
      const deployment = await this.k8sApi.readNamespacedDeployment(
        deploymentName,
        this.namespace
      );

      // Update replicas
      deployment.body.spec.replicas = replicas;

      // Patch deployment
      await this.k8sApi.patchNamespacedDeployment(
        deploymentName,
        this.namespace,
        deployment.body,
        undefined,
        undefined,
        undefined,
        undefined,
        { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } }
      );

      this.currentScaling[serviceName] = {
        replicas,
        timestamp: new Date(),
      };

      logger.info(`Successfully scaled ${serviceName} to ${replicas} replicas`);
      
      return {
        service: serviceName,
        replicas,
        status: 'success',
      };
    } catch (error) {
      logger.error(`Error scaling ${serviceName}:`, error);
      throw error;
    }
  }

  // Prepare for peak load
  async prepareForPeak(prediction) {
    try {
      logger.info('Preparing for peak load...', prediction);

      const recommendedReplicas = prediction.recommendedReplicas;
      const results = [];

      for (const [service, replicas] of Object.entries(recommendedReplicas)) {
        try {
          const result = await this.scaleService(service, replicas);
          results.push(result);
        } catch (error) {
          logger.error(`Failed to scale ${service}:`, error);
          results.push({
            service,
            status: 'failed',
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('Error preparing for peak:', error);
      throw error;
    }
  }

  // Scale down after peak
  async scaleDownAfterPeak() {
    try {
      logger.info('Scaling down after peak...');

      const baselineReplicas = {
        'order-gateway': 3,
        'stock-service': 2,
        'kitchen-queue': 3,
        'notification-hub': 2,
        'identity-provider': 2,
      };

      const results = [];

      for (const [service, replicas] of Object.entries(baselineReplicas)) {
        try {
          const result = await this.scaleService(service, replicas);
          results.push(result);
        } catch (error) {
          logger.error(`Failed to scale down ${service}:`, error);
          results.push({
            service,
            status: 'failed',
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('Error scaling down:', error);
      throw error;
    }
  }

  // Get scaling recommendations based on current metrics
  async getRecommendations() {
    try {
      const predictions = await trafficPredictor.getCurrentPredictions();
      
      // Get next hour prediction
      const nextHour = predictions.find(p => {
        const predTime = new Date(p.timestamp);
        const now = new Date();
        return predTime > now && predTime <= new Date(now.getTime() + 60 * 60 * 1000);
      });

      if (!nextHour) {
        return {
          action: 'maintain',
          reason: 'No prediction available for next hour',
        };
      }

      const recommendedReplicas = trafficPredictor.calculateReplicasNeeded(
        nextHour.requestsPerSecond
      );

      return {
        action: nextHour.isPeak ? 'scale-up' : 'maintain',
        prediction: nextHour,
        recommendedReplicas,
        confidence: nextHour.confidence,
      };
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      throw error;
    }
  }

  // Get deployment name from service name
  getDeploymentName(serviceName) {
    const deploymentMap = {
      'order-gateway': 'order-gateway',
      'stock-service': 'stock-service',
      'kitchen-queue': 'kitchen-queue',
      'notification-hub': 'notification-hub',
      'identity-provider': 'identity-provider',
    };

    return deploymentMap[serviceName] || serviceName;
  }

  // Get current scaling status
  getCurrentScaling() {
    return this.currentScaling;
  }
}

module.exports = new AutoScaler();
