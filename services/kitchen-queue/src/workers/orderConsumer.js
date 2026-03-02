const config = require('../config/rabbitmq');
const queueService = require('../services/queue.service');
const cookingService = require('../services/cooking.service');
const { pool } = require('../config/database');
const logger = require('../utils/logger');
const {
  orderProcessedTotal,
  orderProcessingDuration,
  activeWorkersGauge,
  messageRetryTotal,
  deadLetterTotal,
  messageAckTotal,
  messageNackTotal,
} = require('../utils/metrics');

let isShuttingDown = false;
let activeProcessing = 0;

/**
 * Update order status in database
 */
const updateOrderStatus = async (orderId, status, metadata = {}) => {
  try {
    await pool.query(
      `UPDATE orders 
       SET status = $1, 
           updated_at = NOW()
       WHERE order_id = $2`,
      [status, orderId]
    );
    logger.debug('Order status updated', { orderId, status });
  } catch (error) {
    logger.error('Failed to update order status', {
      orderId,
      status,
      error: error.message,
    });
    // Don't throw - status update failure shouldn't stop processing
  }
};

/**
 * Process order message
 */
const processOrderMessage = async (message) => {
  const end = orderProcessingDuration.startTimer();
  const startTime = Date.now();

  try {
    const orderData = JSON.parse(message.content.toString());
    const retryCount = message.properties.headers?.['x-retry-count'] || 0;

    logger.info('Processing order message', {
      orderId: orderData.order_id,
      retryCount,
    });

    // Update status to PROCESSING
    await updateOrderStatus(orderData.order_id, 'PROCESSING', {
      started_at: new Date().toISOString(),
    });

    // Publish processing event
    await queueService.publishOrderProcessing(orderData);

    // Process order (cooking simulation)
    const result = await cookingService.processOrder(orderData);

    // Update status to READY
    await updateOrderStatus(orderData.order_id, 'READY', {
      completed_at: result.completed_at,
      cooking_duration: result.cooking_duration,
    });

    // Publish completed event
    await queueService.publishOrderCompleted({
      order_id: orderData.order_id,
      cooking_duration: result.cooking_duration,
    });

    end({ status: 'success' });
    orderProcessedTotal.inc({ status: 'success' });

    const duration = (Date.now() - startTime) / 1000;
    logger.info('Order processed successfully', {
      orderId: orderData.order_id,
      duration: `${duration.toFixed(2)}s`,
    });

    return { success: true };
  } catch (error) {
    end({ status: 'error' });
    orderProcessedTotal.inc({ status: 'error' });

    logger.error('Order processing error', {
      error: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

/**
 * Handle message with retry logic
 */
const handleMessage = async (message) => {
  const channel = queueService.getChannel();
  activeProcessing++;
  activeWorkersGauge.set(activeProcessing);

  try {
    await processOrderMessage(message);

    // Acknowledge message
    channel.ack(message);
    messageAckTotal.inc({ queue: config.queues.orderCreated });

    logger.debug('Message acknowledged', {
      deliveryTag: message.fields.deliveryTag,
    });
  } catch (error) {
    const retryCount = message.properties.headers?.['x-retry-count'] || 0;
    const orderData = JSON.parse(message.content.toString());

    if (retryCount < config.maxRetries) {
      // Retry with delay
      messageRetryTotal.inc({ queue: config.queues.orderCreated });

      logger.warn('Retrying message', {
        orderId: orderData.order_id,
        retryCount: retryCount + 1,
        maxRetries: config.maxRetries,
      });

      // Reject and requeue with delay
      channel.nack(message, false, false);

      // Republish with incremented retry count
      setTimeout(async () => {
        try {
          await channel.publish(
            config.exchanges.orders,
            config.routingKeys.orderCreated,
            message.content,
            {
              persistent: true,
              headers: {
                'x-retry-count': retryCount + 1,
              },
            }
          );
        } catch (republishError) {
          logger.error('Failed to republish message', {
            error: republishError.message,
          });
        }
      }, config.retryDelay);
    } else {
      // Max retries exceeded - send to dead letter queue
      deadLetterTotal.inc({ queue: config.queues.orderCreated, reason: 'max_retries' });
      messageNackTotal.inc({ queue: config.queues.orderCreated });

      logger.error('Max retries exceeded, sending to dead letter queue', {
        orderId: orderData.order_id,
        retryCount,
      });

      // Update order status to FAILED
      await updateOrderStatus(orderData.order_id, 'FAILED', {
        failed_at: new Date().toISOString(),
        error: error.message,
        retry_count: retryCount,
      });

      // Publish failed event
      await queueService.publishOrderFailed(orderData, error);

      // Reject without requeue (goes to dead letter)
      channel.nack(message, false, false);
    }
  } finally {
    activeProcessing--;
    activeWorkersGauge.set(activeProcessing);
  }
};

/**
 * Start consuming messages
 */
const startConsuming = async () => {
  try {
    const channel = queueService.getChannel();

    logger.info('Starting order consumer', {
      queue: config.queues.orderCreated,
      prefetchCount: config.prefetchCount,
    });

    await channel.consume(
      config.queues.orderCreated,
      async (message) => {
        if (message === null) {
          logger.warn('Consumer cancelled by server');
          return;
        }

        if (isShuttingDown) {
          logger.info('Shutting down, rejecting new messages');
          channel.nack(message, false, true); // Requeue
          return;
        }

        await handleMessage(message);
      },
      {
        noAck: false, // Manual acknowledgment
      }
    );

    logger.info('Order consumer started successfully');
  } catch (error) {
    logger.error('Failed to start consumer', { error: error.message });
    throw error;
  }
};

/**
 * Graceful shutdown
 */
const shutdown = async () => {
  logger.info('Initiating graceful shutdown of order consumer');
  isShuttingDown = true;

  // Wait for active processing to complete (max 30 seconds)
  const maxWaitTime = 30000;
  const startTime = Date.now();

  while (activeProcessing > 0 && Date.now() - startTime < maxWaitTime) {
    logger.info('Waiting for active processing to complete', {
      activeProcessing,
      elapsed: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (activeProcessing > 0) {
    logger.warn('Forced shutdown with active processing', { activeProcessing });
  } else {
    logger.info('All processing completed, shutting down cleanly');
  }
};

module.exports = {
  startConsuming,
  shutdown,
};
