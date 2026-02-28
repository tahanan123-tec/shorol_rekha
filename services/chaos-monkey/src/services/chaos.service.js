const logger = require('../utils/logger');

class ChaosService {
  async killService(docker, serviceName, duration) {
    try {
      const container = await this.findContainer(docker, serviceName);
      
      if (!container) {
        throw new Error(`Container ${serviceName} not found`);
      }

      await container.kill();
      
      logger.warn(`Service ${serviceName} killed`);

      return {
        service: serviceName,
        action: 'killed',
        duration: duration || 'indefinite',
      };
    } catch (error) {
      logger.error(`Error killing service ${serviceName}:`, error);
      throw error;
    }
  }

  async restartService(docker, serviceName) {
    try {
      const container = await this.findContainer(docker, serviceName);
      
      if (!container) {
        throw new Error(`Container ${serviceName} not found`);
      }

      const info = await container.inspect();
      
      if (info.State.Running) {
        await container.restart();
      } else {
        await container.start();
      }
      
      logger.info(`Service ${serviceName} restarted`);

      return {
        service: serviceName,
        action: 'restarted',
        status: 'running',
      };
    } catch (error) {
      logger.error(`Error restarting service ${serviceName}:`, error);
      throw error;
    }
  }

  async injectLatency(docker, serviceName, latencyMs, duration) {
    try {
      const container = await this.findContainer(docker, serviceName);
      
      if (!container) {
        throw new Error(`Container ${serviceName} not found`);
      }

      // Use tc (traffic control) to add latency
      const exec = await container.exec({
        Cmd: [
          'sh',
          '-c',
          `tc qdisc add dev eth0 root netem delay ${latencyMs}ms || tc qdisc change dev eth0 root netem delay ${latencyMs}ms`,
        ],
        AttachStdout: true,
        AttachStderr: true,
      });

      await exec.start({ Detach: false });

      logger.warn(`Latency ${latencyMs}ms injected to ${serviceName}`);

      // Schedule removal if duration specified
      if (duration) {
        setTimeout(async () => {
          try {
            const removeExec = await container.exec({
              Cmd: ['sh', '-c', 'tc qdisc del dev eth0 root'],
              AttachStdout: true,
              AttachStderr: true,
            });
            await removeExec.start({ Detach: false });
            logger.info(`Latency removed from ${serviceName}`);
          } catch (err) {
            logger.error(`Error removing latency from ${serviceName}:`, err);
          }
        }, duration);
      }

      return {
        service: serviceName,
        action: 'latency-injected',
        latencyMs,
        duration: duration || 'indefinite',
      };
    } catch (error) {
      logger.error(`Error injecting latency to ${serviceName}:`, error);
      throw error;
    }
  }

  async blockNetwork(docker, serviceName, targetService, duration) {
    try {
      const container = await this.findContainer(docker, serviceName);
      
      if (!container) {
        throw new Error(`Container ${serviceName} not found`);
      }

      let cmd;
      if (targetService) {
        // Block specific service
        cmd = `iptables -A OUTPUT -d ${targetService} -j DROP`;
      } else {
        // Block all outgoing traffic
        cmd = 'iptables -A OUTPUT -j DROP';
      }

      const exec = await container.exec({
        Cmd: ['sh', '-c', cmd],
        AttachStdout: true,
        AttachStderr: true,
      });

      await exec.start({ Detach: false });

      logger.warn(`Network blocked for ${serviceName}`);

      // Schedule unblock if duration specified
      if (duration) {
        setTimeout(async () => {
          try {
            const unblockExec = await container.exec({
              Cmd: ['sh', '-c', 'iptables -F OUTPUT'],
              AttachStdout: true,
              AttachStderr: true,
            });
            await unblockExec.start({ Detach: false });
            logger.info(`Network unblocked for ${serviceName}`);
          } catch (err) {
            logger.error(`Error unblocking network for ${serviceName}:`, err);
          }
        }, duration);
      }

      return {
        service: serviceName,
        action: 'network-blocked',
        target: targetService || 'all',
        duration: duration || 'indefinite',
      };
    } catch (error) {
      logger.error(`Error blocking network for ${serviceName}:`, error);
      throw error;
    }
  }

  async simulateBrokerFailure(docker, duration) {
    try {
      return await this.killService(docker, 'rabbitmq', duration);
    } catch (error) {
      logger.error('Error simulating broker failure:', error);
      throw error;
    }
  }

  async injectCpuStress(docker, serviceName, cpuPercent, duration) {
    try {
      const container = await this.findContainer(docker, serviceName);
      
      if (!container) {
        throw new Error(`Container ${serviceName} not found`);
      }

      // Use stress-ng to create CPU load
      const cores = Math.ceil(cpuPercent / 100);
      const cmd = `stress-ng --cpu ${cores} --timeout ${duration ? duration / 1000 : 3600}s &`;

      const exec = await container.exec({
        Cmd: ['sh', '-c', cmd],
        AttachStdout: true,
        AttachStderr: true,
        Detach: true,
      });

      await exec.start({ Detach: true });

      logger.warn(`CPU stress ${cpuPercent}% injected to ${serviceName}`);

      return {
        service: serviceName,
        action: 'cpu-stress-injected',
        cpuPercent,
        duration: duration || 'indefinite',
      };
    } catch (error) {
      logger.error(`Error injecting CPU stress to ${serviceName}:`, error);
      throw error;
    }
  }

  async injectMemoryStress(docker, serviceName, memoryMB, duration) {
    try {
      const container = await this.findContainer(docker, serviceName);
      
      if (!container) {
        throw new Error(`Container ${serviceName} not found`);
      }

      // Use stress-ng to create memory pressure
      const cmd = `stress-ng --vm 1 --vm-bytes ${memoryMB}M --timeout ${duration ? duration / 1000 : 3600}s &`;

      const exec = await container.exec({
        Cmd: ['sh', '-c', cmd],
        AttachStdout: true,
        AttachStderr: true,
        Detach: true,
      });

      await exec.start({ Detach: true });

      logger.warn(`Memory stress ${memoryMB}MB injected to ${serviceName}`);

      return {
        service: serviceName,
        action: 'memory-stress-injected',
        memoryMB,
        duration: duration || 'indefinite',
      };
    } catch (error) {
      logger.error(`Error injecting memory stress to ${serviceName}:`, error);
      throw error;
    }
  }

  async findContainer(docker, serviceName) {
    const containers = await docker.listContainers({ all: true });
    
    const container = containers.find(
      (c) =>
        c.Names.some((name) => name.includes(serviceName)) ||
        c.Labels['com.docker.compose.service'] === serviceName
    );

    if (!container) {
      return null;
    }

    return docker.getContainer(container.Id);
  }

  async listServices(docker) {
    try {
      const containers = await docker.listContainers({ all: true });
      
      return containers.map((container) => ({
        id: container.Id.substring(0, 12),
        name: container.Names[0].replace('/', ''),
        service: container.Labels['com.docker.compose.service'] || 'unknown',
        status: container.State,
        image: container.Image,
        created: new Date(container.Created * 1000).toISOString(),
      }));
    } catch (error) {
      logger.error('Error listing services:', error);
      throw error;
    }
  }
}

module.exports = new ChaosService();
