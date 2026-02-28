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

    // Assert exchange
    await channel.assertExchange(config.exchanges.stock, 'topic', {
      durable: true,
    });

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
 * Publish message to exchange
 */
const publish = async (routingKey, message) => {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));

    const published = channel.publish(
      config.exchanges.stock,
      routingKey,
      messageBuffer,
      {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now(),
      }
    );

    if (!published) {
      throw new Error('Failed to publish message to exchange');
    }

    logger.info('Message published to exchange', { routingKey, itemId: message.item_id });
    return true;
  } catch (error) {
    logger.error('Failed to publish message', { error: error.message, routingKey });
    throw error;
  }
};

/**
 * Publish stock updated event
 */
const publishStockUpdated = async (stockData) => {
  return await publish(config.routingKeys.stockUpdated, {
    item_id: stockData.item_id,
    quantity: stockData.quantity,
    reserved_quantity: stockData.reserved_quantity,
    version: stockData.version,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Publish stock reserved event
 */
const publishStockReserved = async (reservationData) => {
  return await publish(config.routingKeys.stockReserved, {
    order_id: reservationData.order_id,
    item_id: reservationData.item_id,
    quantity: reservationData.quantity,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Publish stock depleted event
 */
const publishStockDepleted = async (itemData) => {
  return await publish(config.routingKeys.stockDepleted, {
    item_id: itemData.item_id,
    item_name: itemData.item_name,
    timestamp: new Date().toISOString(),
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
  publishStockUpdated,
  publishStockReserved,
  publishStockDepleted,
  close,
};
