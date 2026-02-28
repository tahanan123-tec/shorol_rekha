const logger = require('../utils/logger');
const chaosService = require('../services/chaos.service');

// Active chaos experiments
const activeChaos = new Map();

exports.killService = async (req, res) => {
  try {
    const { serviceName, duration } = req.body;

    if (!serviceName) {
      return res.status(400).json({
        success: false,
        error: 'serviceName is required',
      });
    }

    logger.warn(`Chaos: Killing service ${serviceName}`);

    const result = await chaosService.killService(
      req.app.locals.docker,
      serviceName,
      duration
    );

    // Track active chaos
    if (duration) {
      activeChaos.set(`kill-${serviceName}`, {
        type: 'kill',
        service: serviceName,
        startTime: Date.now(),
        duration,
      });

      // Auto-restart after duration
      setTimeout(async () => {
        await chaosService.restartService(req.app.locals.docker, serviceName);
        activeChaos.delete(`kill-${serviceName}`);
        logger.info(`Chaos: Auto-restarted ${serviceName} after ${duration}ms`);
      }, duration);
    }

    res.json({
      success: true,
      message: `Service ${serviceName} killed`,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error killing service:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.restartService = async (req, res) => {
  try {
    const { serviceName } = req.body;

    if (!serviceName) {
      return res.status(400).json({
        success: false,
        error: 'serviceName is required',
      });
    }

    logger.info(`Chaos: Restarting service ${serviceName}`);

    const result = await chaosService.restartService(
      req.app.locals.docker,
      serviceName
    );

    // Remove from active chaos
    activeChaos.delete(`kill-${serviceName}`);

    res.json({
      success: true,
      message: `Service ${serviceName} restarted`,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error restarting service:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.injectLatency = async (req, res) => {
  try {
    const { serviceName, latencyMs, duration } = req.body;

    if (!serviceName || !latencyMs) {
      return res.status(400).json({
        success: false,
        error: 'serviceName and latencyMs are required',
      });
    }

    logger.warn(`Chaos: Injecting ${latencyMs}ms latency to ${serviceName}`);

    const result = await chaosService.injectLatency(
      req.app.locals.docker,
      serviceName,
      latencyMs,
      duration
    );

    // Track active chaos
    const chaosId = `latency-${serviceName}`;
    activeChaos.set(chaosId, {
      type: 'latency',
      service: serviceName,
      latencyMs,
      startTime: Date.now(),
      duration,
    });

    // Auto-remove after duration
    if (duration) {
      setTimeout(() => {
        activeChaos.delete(chaosId);
        logger.info(`Chaos: Latency injection ended for ${serviceName}`);
      }, duration);
    }

    res.json({
      success: true,
      message: `Latency ${latencyMs}ms injected to ${serviceName}`,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error injecting latency:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.blockNetwork = async (req, res) => {
  try {
    const { serviceName, targetService, duration } = req.body;

    if (!serviceName) {
      return res.status(400).json({
        success: false,
        error: 'serviceName is required',
      });
    }

    logger.warn(`Chaos: Blocking network for ${serviceName}`);

    const result = await chaosService.blockNetwork(
      req.app.locals.docker,
      serviceName,
      targetService,
      duration
    );

    // Track active chaos
    const chaosId = `network-${serviceName}`;
    activeChaos.set(chaosId, {
      type: 'network',
      service: serviceName,
      targetService,
      startTime: Date.now(),
      duration,
    });

    if (duration) {
      setTimeout(() => {
        activeChaos.delete(chaosId);
        logger.info(`Chaos: Network block ended for ${serviceName}`);
      }, duration);
    }

    res.json({
      success: true,
      message: `Network blocked for ${serviceName}`,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error blocking network:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.simulateBrokerFailure = async (req, res) => {
  try {
    const { duration } = req.body;

    logger.warn('Chaos: Simulating message broker failure');

    const result = await chaosService.simulateBrokerFailure(
      req.app.locals.docker,
      duration
    );

    // Track active chaos
    activeChaos.set('broker-failure', {
      type: 'broker-failure',
      service: 'rabbitmq',
      startTime: Date.now(),
      duration,
    });

    // Auto-restart after duration
    if (duration) {
      setTimeout(async () => {
        await chaosService.restartService(req.app.locals.docker, 'rabbitmq');
        activeChaos.delete('broker-failure');
        logger.info('Chaos: Message broker restored');
      }, duration);
    }

    res.json({
      success: true,
      message: 'Message broker failure simulated',
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error simulating broker failure:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.injectCpuStress = async (req, res) => {
  try {
    const { serviceName, cpuPercent, duration } = req.body;

    if (!serviceName || !cpuPercent) {
      return res.status(400).json({
        success: false,
        error: 'serviceName and cpuPercent are required',
      });
    }

    logger.warn(`Chaos: Injecting ${cpuPercent}% CPU stress to ${serviceName}`);

    const result = await chaosService.injectCpuStress(
      req.app.locals.docker,
      serviceName,
      cpuPercent,
      duration
    );

    // Track active chaos
    const chaosId = `cpu-${serviceName}`;
    activeChaos.set(chaosId, {
      type: 'cpu-stress',
      service: serviceName,
      cpuPercent,
      startTime: Date.now(),
      duration,
    });

    if (duration) {
      setTimeout(() => {
        activeChaos.delete(chaosId);
        logger.info(`Chaos: CPU stress ended for ${serviceName}`);
      }, duration);
    }

    res.json({
      success: true,
      message: `CPU stress ${cpuPercent}% injected to ${serviceName}`,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error injecting CPU stress:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.injectMemoryStress = async (req, res) => {
  try {
    const { serviceName, memoryMB, duration } = req.body;

    if (!serviceName || !memoryMB) {
      return res.status(400).json({
        success: false,
        error: 'serviceName and memoryMB are required',
      });
    }

    logger.warn(`Chaos: Injecting ${memoryMB}MB memory stress to ${serviceName}`);

    const result = await chaosService.injectMemoryStress(
      req.app.locals.docker,
      serviceName,
      memoryMB,
      duration
    );

    // Track active chaos
    const chaosId = `memory-${serviceName}`;
    activeChaos.set(chaosId, {
      type: 'memory-stress',
      service: serviceName,
      memoryMB,
      startTime: Date.now(),
      duration,
    });

    if (duration) {
      setTimeout(() => {
        activeChaos.delete(chaosId);
        logger.info(`Chaos: Memory stress ended for ${serviceName}`);
      }, duration);
    }

    res.json({
      success: true,
      message: `Memory stress ${memoryMB}MB injected to ${serviceName}`,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error injecting memory stress:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getChaosStatus = async (req, res) => {
  try {
    const status = Array.from(activeChaos.entries()).map(([id, chaos]) => ({
      id,
      ...chaos,
      elapsed: Date.now() - chaos.startTime,
      remaining: chaos.duration ? chaos.duration - (Date.now() - chaos.startTime) : null,
    }));

    res.json({
      success: true,
      data: {
        active: status,
        count: status.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting chaos status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.stopAllChaos = async (req, res) => {
  try {
    logger.info('Chaos: Stopping all active chaos experiments');

    const results = [];

    for (const [id, chaos] of activeChaos.entries()) {
      try {
        if (chaos.type === 'kill' || chaos.type === 'broker-failure') {
          await chaosService.restartService(req.app.locals.docker, chaos.service);
        }
        results.push({ id, status: 'stopped' });
      } catch (error) {
        results.push({ id, status: 'error', error: error.message });
      }
    }

    activeChaos.clear();

    res.json({
      success: true,
      message: 'All chaos experiments stopped',
      data: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error stopping chaos:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.listServices = async (req, res) => {
  try {
    const services = await chaosService.listServices(req.app.locals.docker);

    res.json({
      success: true,
      data: services,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error listing services:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
