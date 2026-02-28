const config = require('../config/rabbitmq');
const queueService = require('../services/queue.service');
const websocketService = require('../services/websocket.service');
const logger = require('../utils/logger');
const { messageProcessedTotal } = require('../utils/metrics');

/**
 * Handle order.processing event
 */
const handleOrderProcessing = async (message) => {
  try {
    const data = JSON.parse(message.content.toString());

    logger.info('Processing order.processing event', {
      orderId: data.order_id,
    });

    // Send notification to order room
    websocketService.sendToOrder(data.order_id, 'order:status', {
      order_id: data.order_id,
      status: 'PROCESSING',
      message: 'Your order is being prepared in the kitchen',
      started_at: data.started_at,
    });

    messageProcessedTotal.inc({ queue: 'order.processing', status: 'success' });
  } catch (error) {
    messageProcessedTotal.inc({ queue: 'order.processing', status: 'error' });
    logger.error('Failed to handle order.processing', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Handle order.completed event
 */
const handleOrderCompleted = async (message) => {
  try {
    const data = JSON.parse(message.content.toString());

    logger.info('Processing order.completed event', {
      orderId: data.order_id,
    });

    // Send notification to order room
    websocketService.sendToOrder(data.order_id, 'order:status', {
      order_id: data.order_id,
      status: 'READY',
      message: 'Your order is ready for pickup!',
      completed_at: data.completed_at,
      cooking_duration: data.cooking_duration,
    });

    messageProcessedTotal.inc({ queue: 'order.completed', status: 'success' });
  } catch (error) {
    messageProcessedTotal.inc({ queue: 'order.completed', status: 'error' });
    logger.error('Failed to handle order.completed', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Handle order.failed event
 */
const handleOrderFailed = async (message) => {
  try {
    const data = JSON.parse(message.content.toString());

    logger.info('Processing order.failed event', {
      orderId: data.order_id,
    });

    // Send notification to order room
    websocketService.sendToOrder(data.order_id, 'order:status', {
      order_id: data.order_id,
      status: 'FAILED',
      message: 'Order processing failed. Please contact support.',
      error: data.error,
      failed_at: data.failed_at,
    });

    messageProcessedTotal.inc({ queue: 'order.failed', status: 'success' });
  } catch (error) {
    messageProcessedTotal.inc({ queue: 'order.failed', status: 'error' });
    logger.error('Failed to handle order.failed', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Start consuming order events
 */
const startConsuming = async () => {
  try {
    const channel = queueService.getChannel();

    logger.info('Starting order event consumers');

    // Consume order.processing
    await channel.consume(
      config.queues.orderProcessing,
      async (message) => {
        if (message === null) return;

        try {
          await handleOrderProcessing(message);
          channel.ack(message);
        } catch (error) {
          logger.error('Error processing order.processing message', {
            error: error.message,
          });
          channel.nack(message, false, true); // Requeue
        }
      },
      { noAck: false }
    );

    // Consume order.completed
    await channel.consume(
      config.queues.orderCompleted,
      async (message) => {
        if (message === null) return;

        try {
          await handleOrderCompleted(message);
          channel.ack(message);
        } catch (error) {
          logger.error('Error processing order.completed message', {
            error: error.message,
          });
          channel.nack(message, false, true); // Requeue
        }
      },
      { noAck: false }
    );

    // Consume order.failed
    await channel.consume(
      config.queues.orderFailed,
      async (message) => {
        if (message === null) return;

        try {
          await handleOrderFailed(message);
          channel.ack(message);
        } catch (error) {
          logger.error('Error processing order.failed message', {
            error: error.message,
          });
          channel.nack(message, false, true); // Requeue
        }
      },
      { noAck: false }
    );

    logger.info('Order event consumers started successfully');
  } catch (error) {
    logger.error('Failed to start order consumers', { error: error.message });
    throw error;
  }
};

module.exports = {
  startConsuming,
  handleOrderProcessing,
  handleOrderCompleted,
  handleOrderFailed,
};
