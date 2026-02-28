const amqp = require('amqplib');
const config = require('../config/services');
const logger = require('../utils/logger');

let connection = null;
let channel = null;

/**
 * Connect to RabbitMQ
 */
const connect = async () => {
  try {
    connection = await amqp.connect(config.rabbitmq.url);
    channel = await connection.createChannel();

    // Assert exchange
    await channel.assertExchange(config.rabbitmq.exchanges.orders, 'topic', {
      durable: true,
    });

    // Assert queues
    await channel.assertQueue(config.rabbitmq.queues.orderCreated, {
      durable: true,
    });

    await channel.assertQueue(config.rabbitmq.queues.orderProcessing, {
      durable: true,
    });

    await channel.assertQueue(config.rabbitmq.queues.orderCompleted, {
      durable: true,
    });

    // Bind queues to exchange
    await channel.bindQueue(
      config.rabbitmq.queues.orderCreated,
      config.rabbitmq.exchanges.orders,
      'order.created'
    );

    await channel.bindQueue(
      config.rabbitmq.queues.orderProcessing,
      config.rabbitmq.exchanges.orders,
      'order.processing'
    );

    await channel.bindQueue(
      config.rabbitmq.queues.orderCompleted,
      config.rabbitmq.exchanges.orders,
      'order.completed'
    );

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
 * Publish message to queue
 */
const publish = async (routingKey, message) => {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));

    const published = channel.publish(
      config.rabbitmq.exchanges.orders,
      routingKey,
      messageBuffer,
      {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now(),
      }
    );

    if (!published) {
      throw new Error('Failed to publish message to queue');
    }

    logger.info('Message published to queue', { routingKey, orderId: message.order_id });
    return true;
  } catch (error) {
    logger.error('Failed to publish message', { error: error.message, routingKey });
    throw error;
  }
};

/**
 * Publish order created event
 */
const publishOrderCreated = async (orderData) => {
  return await publish('order.created', {
    order_id: orderData.order_id,
    user_id: orderData.user_id,
    student_id: orderData.student_id,
    items: orderData.items,
    total_amount: orderData.total_amount,
    delivery_time: orderData.delivery_time,
    created_at: orderData.created_at,
  });
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
  publishOrderCreated,
  close,
};
