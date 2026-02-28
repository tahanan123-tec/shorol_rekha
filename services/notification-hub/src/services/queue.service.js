const amqp = require('amqplib');
const config = require('../config/rabbitmq');
const logger = require('../utils/logger');

let connection = null;
let channel = null;

/**
 * Connect to RabbitMQ
 */
const connect = async () => {
  try {
    connection = await amqp.connect(config.url);
    channel = await connection.createChannel();

    logger.info('RabbitMQ connection established');

    // Handle connection errors
    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error', { error: err.message });
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
    });

    return { connection, channel };
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ', { error: error.message });
    throw error;
  }
};

/**
 * Set up queues and bindings
 */
const setupQueues = async () => {
  try {
    // Assert exchanges
    await channel.assertExchange(config.exchanges.orders, 'topic', {
      durable: true,
    });

    await channel.assertExchange(config.exchanges.stock, 'topic', {
      durable: true,
    });

    // Assert queues
    await channel.assertQueue(config.queues.orderProcessing, {
      durable: true,
    });

    await channel.assertQueue(config.queues.orderCompleted, {
      durable: true,
    });

    await channel.assertQueue(config.queues.orderFailed, {
      durable: true,
    });

    await channel.assertQueue(config.queues.stockUpdated, {
      durable: true,
    });

    // Bind queues to exchanges
    await channel.bindQueue(
      config.queues.orderProcessing,
      config.exchanges.orders,
      config.routingKeys.orderProcessing
    );

    await channel.bindQueue(
      config.queues.orderCompleted,
      config.exchanges.orders,
      config.routingKeys.orderCompleted
    );

    await channel.bindQueue(
      config.queues.orderFailed,
      config.exchanges.orders,
      config.routingKeys.orderFailed
    );

    await channel.bindQueue(
      config.queues.stockUpdated,
      config.exchanges.stock,
      config.routingKeys.stockUpdated
    );

    logger.info('RabbitMQ queues and bindings configured');
  } catch (error) {
    logger.error('Failed to setup queues', { error: error.message });
    throw error;
  }
};

/**
 * Get channel
 */
const getChannel = () => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  return channel;
};

/**
 * Close RabbitMQ connection
 */
const close = async () => {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    logger.info('RabbitMQ connection closed');
  } catch (error) {
    logger.error('Error closing RabbitMQ connection', { error: error.message });
  }
};

module.exports = {
  connect,
  setupQueues,
  getChannel,
  close,
};
