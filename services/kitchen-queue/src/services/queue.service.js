const amqp = require('amqplib');
const config = require('../config/rabbitmq');
const logger = require('../utils/logger');

let connection = null;
let channel = null;

/**
 * Connect to RabbitMQ and set up queues
 */
const connect = async () => {
  try {
    connection = await amqp.connect(config.url);
    channel = await connection.createChannel();

    // Set prefetch count for fair dispatch
    await channel.prefetch(config.prefetchCount);

    // Assert exchange
    await channel.assertExchange(config.exchanges.orders, 'topic', {
      durable: true,
    });

    // Assert main queues without dead letter configuration to avoid conflicts
    await channel.assertQueue(config.queues.orderCreated, {
      durable: true,
    });

    await channel.assertQueue(config.queues.orderProcessing, {
      durable: true,
    });

    await channel.assertQueue(config.queues.orderCompleted, {
      durable: true,
    });

    await channel.assertQueue(config.queues.orderFailed, {
      durable: true,
    });

    // Bind queues to exchange
    await channel.bindQueue(
      config.queues.orderCreated,
      config.exchanges.orders,
      config.routingKeys.orderCreated
    );

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

    logger.info('RabbitMQ connection established and queues configured');

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
 * Publish message to exchange
 */
const publish = async (routingKey, message, options = {}) => {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));

    const published = channel.publish(
      config.exchanges.orders,
      routingKey,
      messageBuffer,
      {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now(),
        ...options,
      }
    );

    if (!published) {
      throw new Error('Failed to publish message to exchange');
    }

    logger.debug('Message published', { routingKey, orderId: message.order_id });
    return true;
  } catch (error) {
    logger.error('Failed to publish message', { error: error.message, routingKey });
    throw error;
  }
};

/**
 * Publish order processing event
 */
const publishOrderProcessing = async (orderData) => {
  return await publish(config.routingKeys.orderProcessing, {
    order_id: orderData.order_id,
    status: 'PROCESSING',
    started_at: new Date().toISOString(),
  });
};

/**
 * Publish order completed event
 */
const publishOrderCompleted = async (orderData) => {
  return await publish(config.routingKeys.orderCompleted, {
    order_id: orderData.order_id,
    status: 'READY',
    completed_at: new Date().toISOString(),
    cooking_duration: orderData.cooking_duration,
  });
};

/**
 * Publish order failed event
 */
const publishOrderFailed = async (orderData, error) => {
  return await publish(config.routingKeys.orderFailed, {
    order_id: orderData.order_id,
    status: 'FAILED',
    error: error.message,
    failed_at: new Date().toISOString(),
  });
};

/**
 * Get queue depth
 */
const getQueueDepth = async (queueName) => {
  try {
    if (!channel) {
      return 0;
    }
    const queue = await channel.checkQueue(queueName);
    return queue.messageCount;
  } catch (error) {
    logger.error('Failed to get queue depth', { error: error.message, queueName });
    return 0;
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
  publish,
  publishOrderProcessing,
  publishOrderCompleted,
  publishOrderFailed,
  getQueueDepth,
  getChannel,
  close,
};
